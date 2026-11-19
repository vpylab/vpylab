// Kept self-contained because the standalone HTML embeds this factory.
export function createRenderColorNormalizer() {
  function rgb(value) {
    if (!Array.isArray(value) || value.length !== 3) return value;
    const [r, g, b] = value;
    if (r <= 1 && g <= 1 && b <= 1) return value;
    if (!value.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)) return value;
    return [r / 255, g / 255, b / 255];
  }

  function mapChanged(values, convert) {
    let updated = values;
    for (let i = 0; i < values.length; i++) {
      const next = convert(values[i]);
      if (next !== values[i]) {
        if (updated === values) updated = values.slice();
        updated[i] = next;
      }
    }
    return updated;
  }

  function vertexColor(vertex) {
    if (!vertex?.color) return vertex;
    const color = rgb(vertex.color);
    return color === vertex.color ? vertex : { ...vertex, color };
  }

  const rgbFields = ['color', 'background', 'trail_color', 'start_face_color', 'end_face_color'];
  return function forRendering(command) {
    if (command.action === 'scene') {
      if (command.property !== 'background' && command.property !== 'ambient') return command;
      const value = rgb(command.value);
      return value === command.value ? command : { ...command, value };
    }
    // Position-only animation is the frequent path. Keep the original message there.
    if (!command.color && !command.colors && !command.vertices && !command.background &&
        !command.trail_color && !command.start_face_color && !command.end_face_color) return command;
    let result = command;
    function replace(key, value) {
      if (value !== command[key]) {
        if (result === command) result = { ...command };
        result[key] = value;
      }
    }
    for (const key of rgbFields) {
      if (command[key]) replace(key, rgb(command[key]));
    }
    if (Array.isArray(command.colors)) replace('colors', mapChanged(command.colors, rgb));
    if (Array.isArray(command.vertices)) replace('vertices', mapChanged(command.vertices, vertexColor));
    return result;
  };
}

export const normalizeRenderColors = createRenderColorNormalizer();
