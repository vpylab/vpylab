"""
VPyLab 학생 코드 변환기 — GlowScript와 같은 실행 의미를 만든다.

브라우저에는 블로킹 대기가 없으므로 rate()·sleep()·scene.pause()·scene.waitfor()·input()·악기()는
코루틴이다. 학생은 GlowScript처럼 평범한 함수로 쓰므로, 실행 전에 이 모듈이 코드를 다음과 같이 바꾼다.

1. 위 호출(대기 함수)이 들어 있는 def(중첩 함수·클래스 메서드 포함)를 async def로 바꾼다.
2. 그렇게 바뀐 함수를 부르는 자리에도 await를 붙인다. 호출 그래프를 따라 변하지 않을 때까지 반복한다.
3. 모듈 수준의 호출에는 최상위 await를 붙인다(PyCF_ALLOW_TOP_LEVEL_AWAIT). 코드를 함수로 감싸지
   않으므로 모듈 전역이 진짜 전역이고 global 선언이 동작한다.

호출은 세 가지로 나눈다.
- 확정 대기: 이름이 스코프 사슬에서 대기 함수(또는 async로 바뀐 def)로 풀리는 호출 → `await f()`.
- 확정 동기: def·class·import·lambda 등으로 풀리고 대기가 아닌 호출 → 그대로.
- 미확정: 매개변수·대입·첨자·호출 결과를 부르거나, 수신자를 모르는 메서드 이름이 async 메서드 이름과
  겹치는 호출 → `await __vpylab_rt__.maybe_await(f())`. 코루틴이면 기다리고 일반 값이면 그대로 돌려주므로
  `for b in balls: b.update()`·`fn()`·`actions[k]()`가 모두 동작하고, 같은 이름의 다른 객체(`random.choice`)도
  깨지지 않는다.

문자열·주석 안의 가짜 호출은 ast가 파싱 단계에서 걸러 낸다. 줄 번호는 ast 노드가 그대로 갖고 있으므로
변환된 코드 객체의 트레이스백 줄 번호가 학생이 쓴 줄 번호와 같다.

GlowScript(lib/compiling/GScompiler.js)는 rate·sleep·get_library·read_local_file과 scene.pause·
scene.waitfor·scene.capture를 대기 함수로 두고 사용자 함수 전부를 async로 바꾼다. 여기서는 대기
함수를 실제로(직접·간접으로) 부르는 함수만 바꾼다. 그래야 평범한 함수의 반환값·속도가 그대로 유지된다.

이 파일은 Pyodide(CPython 3.12)와 하네스(CPython 3.11 이상) 양쪽에서 실행된다. js 모듈을 쓰지 않는다.
실행기(vpython-api.py의 _vpylab_run)는 이 모듈 객체를 학생 네임스페이스에 `__vpylab_rt__`로 넣는다.
"""
import ast
import inspect

# 바로 부르는 코루틴 이름 (vpython-api.py에서 async def로 정의)
BLOCKING_NAMES = frozenset({'rate', 'sleep', '악기', '음표', 'play_note_and_wait', '화음', 'input'})
# scene.<이름>(...) 형태의 코루틴 메서드
SCENE_BLOCKING_ATTRS = frozenset({'pause', 'waitfor'})
# `import vpython as vp` 뒤 vp.rate()·vp.scene.pause()를 인식하기 위한 모듈 이름
VPYTHON_MODULES = frozenset({'vpython'})
# 변환된 코드가 런타임 보조를 부를 때 쓰는 이름 (학생 네임스페이스에 실행기가 넣는다)
RUNTIME_NAME = '__vpylab_rt__'

_FUNC_NODES = (ast.FunctionDef, ast.AsyncFunctionDef)
_SCOPE_NODES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)
_COMPREHENSIONS = (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)

CERTAIN_ASYNC = 'async'
CERTAIN_SYNC = 'sync'
UNCERTAIN = 'maybe'


async def maybe_await(value):
    """미확정 호출의 결과가 코루틴(또는 Future·Task 같은 awaitable)이면 기다리고, 아니면 그대로 돌려준다."""
    if inspect.isasyncgen(value):
        raise TypeError("rate()·sleep() 같은 대기 함수가 든 제너레이터는 쓸 수 없습니다. for 문이나 리스트로 바꾸세요.")
    if inspect.isawaitable(value):
        return await value
    return value


# async def로 바꾸면 파이썬 규약이 깨지는 특수 메서드 — 대기 함수를 넣으면 경고만 낸다
SYNC_ONLY_DUNDERS = frozenset({
    '__str__', '__repr__', '__format__', '__eq__', '__ne__', '__lt__', '__le__', '__gt__', '__ge__',
    '__len__', '__bool__', '__hash__', '__iter__', '__next__', '__getitem__', '__setitem__', '__delitem__',
    '__contains__', '__enter__', '__exit__', '__del__', '__getattr__', '__setattr__', '__index__',
    '__int__', '__float__', '__add__', '__sub__', '__mul__', '__truediv__', '__neg__', '__call__',
})


# === 스코프와 바인딩 ===
class _Binding:
    __slots__ = ('kind', 'node', 'value', 'target')

    def __init__(self, kind, node=None, value=None, target=None):
        # kind: def · class · lambda · param · assign · import · vpmodule · vpname
        self.kind = kind
        self.node = node        # def/class/lambda 노드, vpname이면 원래 이름(str)
        self.value = value      # assign이면 대입된 값 노드
        self.target = target


class _Scope:
    __slots__ = ('kind', 'node', 'parent', 'bindings', 'globals', 'nonlocals', 'star_vpython', 'children')

    def __init__(self, kind, node, parent):
        self.kind = kind            # module · function · class · lambda
        self.node = node
        self.parent = parent
        self.bindings = {}          # name → [_Binding, ...]
        self.globals = set()
        self.nonlocals = set()
        self.star_vpython = False   # from vpython import * 가 있는 스코프
        self.children = []

    def bind(self, name, binding):
        self.bindings.setdefault(name, []).append(binding)


def _target_names(target):
    """대입 대상에서 이름들을 (이름, 값 위치) 없이 평탄하게 뽑는다."""
    if isinstance(target, ast.Name):
        return [target.id]
    if isinstance(target, (ast.Tuple, ast.List)):
        names = []
        for elt in target.elts:
            names.extend(_target_names(elt))
        return names
    if isinstance(target, ast.Starred):
        return _target_names(target.value)
    return []


class _ScopeBuilder(ast.NodeVisitor):
    """AST를 한 번 돌며 스코프 트리와 바인딩을 만든다."""

    def __init__(self):
        self.module = None
        self.scope = None
        self.scope_of = {}     # id(노드) → 그 노드가 만드는 _Scope
        self.enclosing = {}    # id(노드) → 노드가 놓인 _Scope

    def visit_Module(self, node):
        self.module = _Scope('module', node, None)
        self.scope = self.module
        self.scope_of[id(node)] = self.module
        self.generic_visit(node)

    def _enter(self, kind, node):
        scope = _Scope(kind, node, self.scope)
        self.scope.children.append(scope)
        self.scope_of[id(node)] = scope
        self.enclosing[id(node)] = self.scope
        return scope

    def _visit_function(self, node):
        self.scope.bind(node.name, _Binding('def', node))
        # 데코레이터·기본 인수·반환 주석은 바깥 스코프에서 평가된다
        for dec in node.decorator_list:
            self.visit(dec)
        for default in list(node.args.defaults) + [d for d in node.args.kw_defaults if d is not None]:
            self.visit(default)
        if node.returns is not None:
            self.visit(node.returns)
        inner = self._enter('function', node)
        saved, self.scope = self.scope, inner
        args = node.args
        for arg in list(args.posonlyargs) + list(args.args) + list(args.kwonlyargs):
            inner.bind(arg.arg, _Binding('param', arg))
        if args.vararg:
            inner.bind(args.vararg.arg, _Binding('param', args.vararg))
        if args.kwarg:
            inner.bind(args.kwarg.arg, _Binding('param', args.kwarg))
        for stmt in node.body:
            self.visit(stmt)
        self.scope = saved

    visit_FunctionDef = _visit_function
    visit_AsyncFunctionDef = _visit_function

    def visit_Lambda(self, node):
        for default in list(node.args.defaults) + [d for d in node.args.kw_defaults if d is not None]:
            self.visit(default)
        inner = self._enter('lambda', node)
        saved, self.scope = self.scope, inner
        args = node.args
        for arg in list(args.posonlyargs) + list(args.args) + list(args.kwonlyargs):
            inner.bind(arg.arg, _Binding('param', arg))
        if args.vararg:
            inner.bind(args.vararg.arg, _Binding('param', args.vararg))
        if args.kwarg:
            inner.bind(args.kwarg.arg, _Binding('param', args.kwarg))
        self.visit(node.body)
        self.scope = saved

    def visit_ClassDef(self, node):
        self.scope.bind(node.name, _Binding('class', node))
        for dec in node.decorator_list:
            self.visit(dec)
        for base in node.bases:
            self.visit(base)
        for kw in node.keywords:
            self.visit(kw)
        inner = self._enter('class', node)
        saved, self.scope = self.scope, inner
        for stmt in node.body:
            self.visit(stmt)
        self.scope = saved

    def _bind_assign_targets(self, targets, value):
        for target in targets:
            if isinstance(target, ast.Name):
                self.scope.bind(target.id, _Binding('assign', value=value, target=target))
            elif isinstance(target, (ast.Tuple, ast.List)):
                elts = target.elts
                # p1, p2 = Player(), Player() → 짝을 맞춰 값 노드를 기록한다
                if isinstance(value, (ast.Tuple, ast.List)) and len(value.elts) == len(elts) \
                        and not any(isinstance(e, ast.Starred) for e in elts):
                    for elt, val in zip(elts, value.elts):
                        self._bind_assign_targets([elt], val)
                else:
                    for name in _target_names(target):
                        self.scope.bind(name, _Binding('assign', value=None))
            elif isinstance(target, ast.Starred):
                for name in _target_names(target):
                    self.scope.bind(name, _Binding('assign', value=None))
            # 속성·첨자 대상은 이름을 바인딩하지 않는다

    def visit_Assign(self, node):
        self.visit(node.value)
        self._bind_assign_targets(node.targets, node.value)
        for target in node.targets:
            self.visit(target)

    def visit_AnnAssign(self, node):
        if node.value is not None:
            self.visit(node.value)
            self._bind_assign_targets([node.target], node.value)
        self.visit(node.target)
        self.visit(node.annotation)

    def visit_AugAssign(self, node):
        self.visit(node.value)
        self._bind_assign_targets([node.target], None)
        self.visit(node.target)

    def visit_NamedExpr(self, node):
        self.visit(node.value)
        self.scope.bind(node.target.id, _Binding('assign', value=node.value))

    def _bind_loop_target(self, target):
        for name in _target_names(target):
            self.scope.bind(name, _Binding('assign', value=None))

    def visit_For(self, node):
        self._bind_loop_target(node.target)
        self.generic_visit(node)

    visit_AsyncFor = visit_For

    def visit_comprehension(self, node):
        # 컴프리헨션 변수는 가까운 스코프의 바인딩으로 본다 (근사)
        self._bind_loop_target(node.target)
        self.generic_visit(node)

    def visit_With(self, node):
        for item in node.items:
            if item.optional_vars is not None:
                self._bind_loop_target(item.optional_vars)
        self.generic_visit(node)

    visit_AsyncWith = visit_With

    def visit_ExceptHandler(self, node):
        if node.name:
            self.scope.bind(node.name, _Binding('assign', value=None))
        self.generic_visit(node)

    def visit_MatchAs(self, node):
        if node.name:
            self.scope.bind(node.name, _Binding('assign', value=None))
        self.generic_visit(node)

    def visit_MatchStar(self, node):
        if node.name:
            self.scope.bind(node.name, _Binding('assign', value=None))

    def visit_MatchMapping(self, node):
        if node.rest:
            self.scope.bind(node.rest, _Binding('assign', value=None))
        self.generic_visit(node)

    def visit_Import(self, node):
        for alias in node.names:
            bound = alias.asname or alias.name.split('.')[0]
            if alias.name in VPYTHON_MODULES:
                self.scope.bind(bound, _Binding('vpmodule'))
            else:
                self.scope.bind(bound, _Binding('import'))

    def visit_ImportFrom(self, node):
        if node.module in VPYTHON_MODULES:
            for alias in node.names:
                if alias.name == '*':
                    self.scope.star_vpython = True
                else:
                    self.scope.bind(alias.asname or alias.name, _Binding('vpname', node=alias.name))
        else:
            for alias in node.names:
                if alias.name != '*':
                    self.scope.bind(alias.asname or alias.name, _Binding('import'))

    def visit_Global(self, node):
        self.scope.globals.update(node.names)

    def visit_Nonlocal(self, node):
        self.scope.nonlocals.update(node.names)


# === 분석 ===
class _Analysis:
    def __init__(self, tree):
        builder = _ScopeBuilder()
        builder.visit(tree)
        self.module_scope = builder.module
        self.scope_of = builder.scope_of
        self.functions = []            # 모든 def 노드 (등장 순)
        self.func_scope = {}           # id(def) → _Scope (그 def 본문 스코프)
        self.class_of_method = {}      # id(def) → ClassDef (메서드일 때)
        self.async_nodes = set()       # async def로 바꿀 def의 id
        self.sync_only = set()         # 바꿀 수 없는 def의 id (생성기·__init__)
        self.async_method_names = set()
        self.warnings = []
        self._visiting = set()
        self._collect(self.module_scope)

    def _collect(self, scope):
        for child in scope.children:
            if child.kind == 'function':
                node = child.node
                self.functions.append(node)
                self.func_scope[id(node)] = child
                if scope.kind == 'class':
                    self.class_of_method[id(node)] = scope.node
                if isinstance(node, ast.AsyncFunctionDef):
                    self.async_nodes.add(id(node))
            self._collect(child)

    # --- 이름 풀이 ---
    def resolve(self, scope, name):
        """스코프 사슬에서 이름의 바인딩 목록과 그 스코프를 찾는다. 없으면 (None, None)."""
        current = scope
        first = True
        while current is not None:
            if name in current.globals and current is not self.module_scope:
                # global 선언 — 모듈 전역만 본다 (모듈 수준의 global 선언은 아무 뜻이 없다)
                module = self.module_scope
                if name in module.bindings:
                    return module.bindings[name], module
                return None, None
            if current.kind == 'class' and not first:
                current = current.parent
                continue
            if name in current.bindings and name not in current.nonlocals:
                return current.bindings[name], current
            current = current.parent
            first = False
        return None, None

    def star_imports_vpython(self, scope):
        current = scope
        while current is not None:
            if current.star_vpython:
                return True
            current = current.parent
        return False

    def _class_binding(self, scope, name):
        bindings, _ = self.resolve(scope, name)
        if bindings and len(bindings) == 1 and bindings[0].kind == 'class':
            return bindings[0].node
        return None

    def _find_method(self, class_node, method_name, seen=None):
        """클래스(와 사용자 기반 클래스)에서 메서드 def를 찾는다."""
        seen = seen or set()
        if id(class_node) in seen:
            return None
        seen.add(id(class_node))
        for stmt in class_node.body:
            if isinstance(stmt, _FUNC_NODES) and stmt.name == method_name:
                return stmt
        class_scope = self.scope_of.get(id(class_node))
        outer = class_scope.parent if class_scope else self.module_scope
        for base in class_node.bases:
            if isinstance(base, ast.Name):
                base_node = self._class_binding(outer, base.id)
                if base_node is not None:
                    found = self._find_method(base_node, method_name, seen)
                    if found is not None:
                        return found
        return None

    def _func_kind(self, node):
        if id(node) in self.async_nodes and id(node) not in self.sync_only:
            return CERTAIN_ASYNC
        return CERTAIN_SYNC

    def _lambda_kind(self, node):
        """람다는 async가 될 수 없다. 본문에 대기 호출이 있으면 코루틴을 돌려줄 수 있으므로 미확정."""
        if id(node) in self._visiting:
            return UNCERTAIN  # f = lambda: f() 같은 자기 참조
        self._visiting.add(id(node))
        try:
            for call in _iter_scope_calls(node):
                if self.classify_call(call, self.scope_of[id(node)]) != CERTAIN_SYNC:
                    return UNCERTAIN
            return CERTAIN_SYNC
        finally:
            self._visiting.discard(id(node))

    def _name_kind(self, scope, name, depth=0):
        """이름으로 부르는 호출의 분류"""
        if depth > 8:
            return UNCERTAIN
        bindings, _ = self.resolve(scope, name)
        if not bindings:
            # 바인딩이 없으면 API 전역(또는 from vpython import *)에서 온 이름이다
            return CERTAIN_ASYNC if name in BLOCKING_NAMES else CERTAIN_SYNC
        if len(bindings) > 1:
            kinds = {b.kind for b in bindings}
            if kinds == {'def'}:
                func_kinds = {self._func_kind(b.node) for b in bindings}
                return func_kinds.pop() if len(func_kinds) == 1 else UNCERTAIN
            return UNCERTAIN
        b = bindings[0]
        if b.kind == 'def':
            return self._func_kind(b.node)
        if b.kind == 'class':
            return CERTAIN_SYNC
        if b.kind == 'lambda':
            return self._lambda_kind(b.node)
        if b.kind == 'vpname':
            return CERTAIN_ASYNC if b.node in BLOCKING_NAMES else CERTAIN_SYNC
        if b.kind in ('import', 'vpmodule'):
            return CERTAIN_SYNC
        if b.kind == 'assign' and isinstance(b.value, ast.Lambda):
            return self._lambda_kind(b.value)
        if b.kind == 'assign' and isinstance(b.value, ast.Call) and isinstance(b.value.func, ast.Name) \
                and self._class_binding(scope, b.value.func.id) is not None:
            return CERTAIN_SYNC  # 인스턴스를 바로 부르면 __call__ — 대기와 무관
        if b.kind == 'assign' and isinstance(b.value, ast.Name):
            return self._name_kind(scope, b.value.id, depth + 1)  # vec = vector, f = move
        if b.kind == 'assign' and isinstance(b.value, ast.Attribute) and isinstance(b.value.value, ast.Name):
            mod, _ = self.resolve(scope, b.value.value.id)
            if mod and len(mod) == 1 and mod[0].kind == 'import':
                return CERTAIN_SYNC  # choice = random.choice
        return UNCERTAIN  # 매개변수·대입·반복 변수 등

    def _receiver_class(self, scope, receiver):
        """수신자 이름이 어느 사용자 클래스의 인스턴스인지 확정할 수 있으면 ClassDef"""
        if not isinstance(receiver, ast.Name):
            return None
        if receiver.id in ('self', 'cls'):
            s = scope
            while s is not None and s.kind != 'function':
                s = s.parent
            if s is not None:
                return self.class_of_method.get(id(s.node))
            return None
        bindings, _ = self.resolve(scope, receiver.id)
        if not bindings or len(bindings) != 1:
            return None
        b = bindings[0]
        if b.kind == 'assign' and isinstance(b.value, ast.Call) and isinstance(b.value.func, ast.Name):
            return self._class_binding(scope, b.value.func.id)
        return None

    def _is_scene(self, scope, node):
        if isinstance(node, ast.Name):
            if node.id == 'scene':
                bindings, _ = self.resolve(scope, 'scene')
                if not bindings:
                    return True
                return len(bindings) == 1 and bindings[0].kind == 'vpname' and bindings[0].node == 'scene'
            bindings, _ = self.resolve(scope, node.id)
            if bindings and len(bindings) == 1:
                b = bindings[0]
                if b.kind == 'vpname':
                    return b.node == 'scene'
                if b.kind == 'assign' and b.value is not None:
                    return self._is_scene(scope, b.value)
            return False
        if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.attr == 'scene':
            bindings, _ = self.resolve(scope, node.value.id)
            return bool(bindings) and len(bindings) == 1 and bindings[0].kind == 'vpmodule'
        return False

    def classify_call(self, call, scope):
        """Call 노드를 확정 대기·확정 동기·미확정으로 나눈다."""
        func = call.func
        if isinstance(func, ast.Name):
            return self._name_kind(scope, func.id)
        if isinstance(func, ast.Attribute):
            attr = func.attr
            receiver = func.value
            if attr in SCENE_BLOCKING_ATTRS and self._is_scene(scope, receiver):
                return CERTAIN_ASYNC
            if isinstance(receiver, ast.Name):
                bindings, _ = self.resolve(scope, receiver.id)
                if bindings and len(bindings) == 1 and bindings[0].kind == 'vpmodule':
                    return CERTAIN_ASYNC if attr in BLOCKING_NAMES else CERTAIN_SYNC
                if bindings and len(bindings) == 1 and bindings[0].kind == 'import':
                    return CERTAIN_SYNC  # math.sqrt(), random.choice()
            class_node = self._receiver_class(scope, receiver)
            if class_node is not None:
                method = self._find_method(class_node, attr)
                if method is not None:
                    kind = self._func_kind(method)
                    if kind == CERTAIN_SYNC and attr in self.async_method_names:
                        return UNCERTAIN  # 자식 클래스가 대기 메서드로 재정의했을 수 있다
                    return kind
            if attr in self.async_method_names or attr in SCENE_BLOCKING_ATTRS:
                return UNCERTAIN
            return CERTAIN_SYNC
        # 첨자·호출 결과·람다식 등을 바로 부르는 경우
        return UNCERTAIN

    # --- 고정점 ---
    def mark_async(self):
        changed = True
        while changed:
            changed = False
            for node in self.functions:
                if id(node) in self.async_nodes or id(node) in self.sync_only:
                    continue
                scope = self.func_scope[id(node)]
                needs = any(self.classify_call(c, scope) != CERTAIN_SYNC for c in _iter_scope_calls(node))
                if not needs:
                    continue
                if _contains_yield(node):
                    self.sync_only.add(id(node))
                    self.warnings.append(
                        f"{node.lineno}번 줄: yield가 있는 함수 {node.name}() 안에서는 rate()·sleep() 같은 대기 함수를 쓸 수 없습니다.")
                    continue
                if node.name == '__init__' and id(node) in self.class_of_method:
                    self.sync_only.add(id(node))
                    self.warnings.append(
                        f"{node.lineno}번 줄: __init__ 안에서는 rate()·sleep() 같은 대기 함수를 쓸 수 없습니다. 별도 메서드로 옮기세요.")
                    continue
                if id(node) in self.class_of_method and (node.name in SYNC_ONLY_DUNDERS or _is_property(node)):
                    self.sync_only.add(id(node))
                    self.warnings.append(
                        f"{node.lineno}번 줄: {node.name}() 같은 특수 메서드·property 안에서는 rate()·sleep() 같은 대기 함수를 쓸 수 없습니다.")
                    continue
                self.async_nodes.add(id(node))
                if id(node) in self.class_of_method:
                    self.async_method_names.add(node.name)
                changed = True
        # 학생이 직접 쓴 async def 메서드 이름도 미확정 판단에 포함
        for node in self.functions:
            if id(node) in self.async_nodes and id(node) in self.class_of_method:
                self.async_method_names.add(node.name)

    def is_async_def(self, node):
        return id(node) in self.async_nodes and id(node) not in self.sync_only

    def register_replacement(self, old, new):
        """변환기가 def를 async def 노드로 바꿀 때 분석 결과를 새 노드에도 잇는다."""
        self.async_nodes.add(id(new))
        if id(old) in self.func_scope:
            self.func_scope[id(new)] = self.func_scope[id(old)]
            self.scope_of[id(new)] = self.scope_of[id(old)]
        if id(old) in self.class_of_method:
            self.class_of_method[id(new)] = self.class_of_method[id(old)]


def _is_property(func):
    """@property·@x.setter·@x.getter·@x.deleter가 붙은 메서드"""
    for dec in func.decorator_list:
        if isinstance(dec, ast.Name) and dec.id == 'property':
            return True
        if isinstance(dec, ast.Attribute) and dec.attr in ('setter', 'getter', 'deleter'):
            return True
    return False


def _contains_yield(func):
    for child in _iter_scope(func):
        if isinstance(child, (ast.Yield, ast.YieldFrom)):
            return True
    return False


def _iter_scope(node):
    """노드 아래를 순회하되 중첩된 함수·람다·클래스 안으로는 들어가지 않는다.
    데코레이터·기본 인수는 바깥 스코프에 속하므로 중첩 def의 그 부분은 포함한다."""
    stack = list(ast.iter_child_nodes(node))
    while stack:
        child = stack.pop()
        yield child
        if isinstance(child, _FUNC_NODES):
            stack.extend(child.decorator_list)
            stack.extend(child.args.defaults)
            stack.extend(d for d in child.args.kw_defaults if d is not None)
            continue
        if isinstance(child, ast.Lambda):
            stack.extend(child.args.defaults)
            stack.extend(d for d in child.args.kw_defaults if d is not None)
            continue
        if isinstance(child, ast.ClassDef):
            stack.extend(child.decorator_list)
            stack.extend(child.bases)
            stack.extend(child.keywords)
            continue
        stack.extend(ast.iter_child_nodes(child))


def _iter_scope_calls(node):
    for child in _iter_scope(node):
        if isinstance(child, ast.Call):
            yield child


# === 변환 ===
class _Transformer(ast.NodeTransformer):
    """async def 전환과 await 삽입. 호출의 분류는 그 호출이 놓인 스코프에서 한다."""

    def __init__(self, analysis):
        self.analysis = analysis
        self.scope = analysis.module_scope
        # (awaitable, 문맥 이름) — 모듈·async 함수는 await 가능
        self.context = [(True, 'module')]
        self.genexp_depth = 0
        self.already_awaited = set()

    def _enter_scope(self, node):
        return self.analysis.scope_of[id(node)]

    def _visit_outer_parts(self, node):
        node.decorator_list = [self.visit(d) for d in node.decorator_list]
        node.args.defaults = [self.visit(d) for d in node.args.defaults]
        node.args.kw_defaults = [self.visit(d) if d is not None else None for d in node.args.kw_defaults]
        if getattr(node, 'returns', None) is not None:
            node.returns = self.visit(node.returns)

    def _visit_body(self, node, awaitable, label):
        saved_scope, self.scope = self.scope, self._enter_scope(node)
        self.context.append((awaitable, label))
        node.body = [self.visit(stmt) for stmt in node.body]
        self.context.pop()
        self.scope = saved_scope

    def visit_FunctionDef(self, node):
        self._visit_outer_parts(node)
        make_async = self.analysis.is_async_def(node)
        self._visit_body(node, make_async, 'async' if make_async else 'sync')
        if not make_async:
            return node
        new = ast.AsyncFunctionDef(
            name=node.name, args=node.args, body=node.body, decorator_list=node.decorator_list,
            returns=node.returns, type_comment=getattr(node, 'type_comment', None),
        )
        if hasattr(node, 'type_params'):
            new.type_params = node.type_params
        # 클래스 본문에서 바뀐 메서드 노드를 뒤에 오는 호출의 분류(_find_method)가 다시 찾을 수 있게 등록
        self.analysis.register_replacement(node, new)
        return ast.copy_location(new, node)

    def visit_AsyncFunctionDef(self, node):
        self._visit_outer_parts(node)
        self._visit_body(node, True, 'async')
        return node

    def visit_Lambda(self, node):
        node.args.defaults = [self.visit(d) for d in node.args.defaults]
        node.args.kw_defaults = [self.visit(d) if d is not None else None for d in node.args.kw_defaults]
        saved_scope, self.scope = self.scope, self._enter_scope(node)
        self.context.append((False, 'lambda'))
        node.body = self.visit(node.body)
        self.context.pop()
        self.scope = saved_scope
        return node

    def visit_ClassDef(self, node):
        node.decorator_list = [self.visit(d) for d in node.decorator_list]
        node.bases = [self.visit(b) for b in node.bases]
        node.keywords = [self.visit(k) for k in node.keywords]
        self._visit_body(node, False, 'class')
        return node

    def visit_GeneratorExp(self, node):
        self.genexp_depth += 1
        self.generic_visit(node)
        self.genexp_depth -= 1
        return node

    def visit_Await(self, node):
        if isinstance(node.value, ast.Call):
            self.already_awaited.add(id(node.value))
        self.generic_visit(node)
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        if id(node) in self.already_awaited:
            return node
        kind = self.analysis.classify_call(node, self.scope)
        if kind == CERTAIN_SYNC:
            return node
        awaitable, label = self.context[-1]
        maybe = '' if kind == CERTAIN_ASYNC else ' (대기 함수를 부를 수 있는 호출)'
        if self.genexp_depth:
            self.analysis.warnings.append(
                f"{node.lineno}번 줄: 제너레이터식 안에서는 {_label(node)}(){maybe}을 기다릴 수 없습니다. for 문이나 리스트 컴프리헨션으로 바꾸세요.")
            return node
        if not awaitable:
            if label == 'lambda':
                self.analysis.warnings.append(
                    f"{node.lineno}번 줄: lambda 안의 {_label(node)}(){maybe}은 기다릴 수 없습니다. def로 바꾸세요.")
            elif label == 'class':
                self.analysis.warnings.append(
                    f"{node.lineno}번 줄: 클래스 본문에서는 {_label(node)}(){maybe}을 기다릴 수 없습니다. 메서드 안으로 옮기세요.")
            # sync(생성기·__init__·특수 메서드)는 mark_async에서 이미 경고했다
            return node
        if kind == CERTAIN_ASYNC:
            return ast.copy_location(ast.Await(value=node), node)
        helper = ast.Attribute(value=ast.Name(id=RUNTIME_NAME, ctx=ast.Load()), attr='maybe_await', ctx=ast.Load())
        wrapped = ast.Call(func=helper, args=[node], keywords=[])
        return ast.copy_location(ast.Await(value=wrapped), node)


def _label(call):
    try:
        return ast.unparse(call.func)
    except Exception:
        return '대기 함수'


def transform_student_code(source, filename='<student>'):
    """학생 코드를 변환한 ast.Module과 경고 목록을 돌려준다. SyntaxError는 그대로 올라간다."""
    tree = ast.parse(source, filename=filename, type_comments=False)
    analysis = _Analysis(tree)
    analysis.mark_async()
    tree = _Transformer(analysis).visit(tree)
    ast.fix_missing_locations(tree)
    return tree, analysis.warnings


def compile_student_code(source, filename='<student>'):
    """변환 뒤 최상위 await를 허용해 컴파일한 코드 객체와 경고 목록"""
    tree, warnings = transform_student_code(source, filename)
    code = compile(tree, filename, 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True)
    return code, warnings


def unparse_student_code(source):
    """테스트·디버깅용: 변환된 코드를 문자열로 (Python 3.9 이상)"""
    tree, warnings = transform_student_code(source)
    return ast.unparse(tree), warnings
