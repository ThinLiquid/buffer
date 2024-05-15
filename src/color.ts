const threshold = 0.75

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
    // Parse the color
    let r
    let g
    let b
    if (color.startsWith('#')) {
      r = parseInt(color.slice(1, 3), 16)
      g = parseInt(color.slice(3, 5), 16)
      b = parseInt(color.slice(5, 7), 16)
    } else {
      return null
    }

    // Calculate the perceived luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Adjust the color based on the luminance
    const adjustment = luminance < threshold ? 10 : -10
    r = Math.max(0, Math.min(255, r + adjustment))
    g = Math.max(0, Math.min(255, g + adjustment))
    b = Math.max(0, Math.min(255, b + adjustment))

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
}

export default Color
