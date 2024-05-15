const threshold = 0.5

class Color {
  /**
   * Get the contrast color of a color
   *
   * @param color The color to get the contrast color of
   * @returns The contrast color
   */
  getContrastColor (color: string): string | null {
    // Remove all whitespace and convert the color to lowercase
    color = color.replace(/\s/g, '').toLowerCase()

    // Convert an rgb color to a hex color
    const rgbToHex = (r: number, g: number, b: number): string =>
      '#' +
      [r, g, b]
        .map(x => {
          const hex = x.toString(16)
          return hex.length === 1 ? `0${hex}` : hex
        })
        .join('')

    // Check if the color is a hex color or an rgb color and convert it to a hex color
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

    // Return the inverted color
    return this.invertColor(hex)
  }

  /**
   * Invert the color of a hex color
   *
   * @param hex The hex color to invert
   * @returns The inverted color
   */
  invertColor (hex: string): string | null {
    if (hex.indexOf('#') === 0) {
      hex = hex.slice(1)
    }

    // Convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }
    if (hex.length !== 6) {
      return null
    }

    // Invert color
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)

    // Calculate the luminance of the color and return the color
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > threshold
      ? '#000000'
      : '#FFFFFF'
  }

  /**
   * Adjust the contrast of a color for #000000
   *
   * @param color The color to adjust
   * @returns The adjusted color
   */
  adjustContrastColor (color: string): string | null {
    let r
    let g
    let b

    // Check if the color is in hex or rgb format
    if (color.startsWith('#')) {
      color = color.substring(1)
      r = parseInt(color.substr(0, 2), 16)
      g = parseInt(color.substr(2, 2), 16)
      b = parseInt(color.substr(4, 2), 16)
    } else if (color.startsWith('rgb(') && color.endsWith(')')) {
      const rgb = color.substring(4, color.length - 1).split(',')
      r = parseInt(rgb[0])
      g = parseInt(rgb[1])
      b = parseInt(rgb[2])
    } else {
      return null
    }

    // Calculate the luminance of the color and adjust the color
    if ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > threshold) {
      r = Math.max(0, r - r * 0.5)
      g = Math.max(0, g - g * 0.5)
      b = Math.max(0, b - b * 0.5)
    } else {
      r = Math.min(255, r + r * 0.5)
      g = Math.min(255, g + g * 0.5)
      b = Math.min(255, b + b * 0.5)
    }

    // Return the adjusted color
    return color.startsWith('#')
      ? `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`
      : `rgb(${r},${g},${b})`
  }
}

export default Color
