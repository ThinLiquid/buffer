const threshold = 0.75

class Color {
  constructor () {}

  getContrastColor (color: string): string {
    color = color.replace(/\s/g, '').toLowerCase()

    const rgbToHex = (r: number, g: number, b: number): string =>
      '#' +
      [r, g, b]
        .map(x => {
          const hex = x.toString(16)
          return hex.length === 1 ? `0${hex}` : hex
        })
        .join('')

    let hex
    if (color.startsWith('#')) {
      hex = color
    } else if (color.substring(0, 3) === 'rgb') {
      const rgb = color
        .substring(4, color.length - 1)
        .replace(/ /g, '')
        .split(',')
        .map(x => parseInt(x))
      hex = rgbToHex(rgb[0], rgb[1], rgb[2])
    } else {
      throw new Error('Invalid color')
    }

    return this.invertColor(hex)
  }

  invertColor (hex: string): string {
    if (hex.indexOf('#') === 0) {
      hex = hex.slice(1)
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }
    if (hex.length !== 6) {
      throw new Error(`Invalid HEX color. ${hex}`)
    }
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)

    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > threshold
      ? '#000000'
      : '#FFFFFF'
  }

  adjustContrastColor (color: string) {
    if (color.startsWith('#')) {
      color = color.substring(1)
      var r = parseInt(color.substr(0, 2), 16)
      var g = parseInt(color.substr(2, 2), 16)
      var b = parseInt(color.substr(4, 2), 16)
    } else if (color.startsWith('rgb(') && color.endsWith(')')) {
      const rgb = color.substring(4, color.length - 1).split(',')
      var r = parseInt(rgb[0])
      var g = parseInt(rgb[1])
      var b = parseInt(rgb[2])
    } else {
      return null
    }

    if ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > threshold) {
      r = Math.max(0, r - 100)
      g = Math.max(0, g - 100)
      b = Math.max(0, b - 100)
    } else {
      r = Math.min(255, r + 100)
      g = Math.min(255, g + 100)
      b = Math.min(255, b + 100)
    }

    if (color.startsWith('#')) {
      var adjustedColor = `#${((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)}`
    } else {
      var adjustedColor = `rgb(${r},${g},${b})`
    }

    return adjustedColor
  }
}

export default Color
