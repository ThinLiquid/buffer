const threshold = 0.45

function getContrastRatio (color1: string, color2: string): number {
  const luminance1 = getLuminance(color1)
  const luminance2 = getLuminance(color2)

  return luminance1 > luminance2 ? (luminance1 + 0.05) / (luminance2 + 0.05) : (luminance2 + 0.05) / (luminance1 + 0.05)
}

function getLuminance (color: string): number {
  let r
  let g
  let b

  if (color.startsWith('#')) {
    color = color.substring(1)
    r = parseInt(color.substr(0, 2), 16) / 255
    g = parseInt(color.substr(2, 2), 16) / 255
    b = parseInt(color.substr(4, 2), 16) / 255
  } else if (color.startsWith('rgb(') && color.endsWith(')')) {
    const rgb = color.substring(4, color.length - 1).split(',')
    r = parseInt(rgb[0]) / 255
    g = parseInt(rgb[1]) / 255
    b = parseInt(rgb[2]) / 255
  } else {
    throw new Error('Invalid color')
  }

  // Apply gamma correction
  r = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4
  g = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4
  b = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

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

    // Calculate the contrast ratio with black
    let contrastRatio = getContrastRatio(`rgb(${r},${g},${b})`, '#000000')

    // Adjust the color until it meets the desired contrast ratio
    while (contrastRatio < 7) {
      const luminance = getLuminance(`rgb(${r},${g},${b})`)

      if (luminance < 0.5) {
        r = Math.min(255, r + 10)
        g = Math.min(255, g + 10)
        b = Math.min(255, b + 10)
      } else {
        r = Math.max(0, r - 10)
        g = Math.max(0, g - 10)
        b = Math.max(0, b - 10)
      }

      contrastRatio = getContrastRatio(`rgb(${r},${g},${b})`, '#000000')
    }

    // Return the adjusted color
    return color.startsWith('#')
      ? `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
      : `rgb(${r},${g},${b})`
  }
}

export default Color
