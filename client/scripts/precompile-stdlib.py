"""앱과 같은 Pyodide 안에서 시작할 때 읽는 큰 모듈의 바이트코드를 미리 만듭니다."""
# 학생 코드 변환기와 VPython이 초기화할 때 사용하는 표준 모듈입니다.
import ast
import asyncio
import colorsys
import inspect
import json
import random
import sys
import typing
import weakref

archive = next(path for path in sys.path if path.endswith(".zip"))
prefix = archive + "/"
modules = {
    module.__file__[len(prefix):]
    for module in list(sys.modules.values())
    if str(getattr(module, "__file__", "")).startswith(prefix)
}

import py_compile
import shutil
import zipfile

output = "vpylab-stdlib.zip"
shutil.copyfile(archive, output)
with zipfile.ZipFile(output, "a") as library:
    for filename in sorted(modules):
        info = library.getinfo(filename)
        if not filename.endswith(".py") or info.file_size < 12000:
            continue
        source = "vpylab-module.py"
        with open(source, "wb") as file:
            file.write(library.read(info))
        # 원문을 같은 ZIP에 보관해 inspect, 도움말, 트레이스백도 원래 소스를 찾습니다.
        bytecode = py_compile.compile(
            source, cfile=source + "c", dfile=prefix + filename, doraise=True,
            invalidation_mode=py_compile.PycInvalidationMode.UNCHECKED_HASH,
        )
        entry = zipfile.ZipInfo(filename + "c", date_time=info.date_time)
        with open(bytecode, "rb") as file:
            library.writestr(entry, file.read(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
