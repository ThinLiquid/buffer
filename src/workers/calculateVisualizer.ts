self.onmessage = (event) => {
  const { dataArray, canvasHeight, canvasWidth, bufferLength } = event.data

  let x = 0
  let lineHeight
  const lineGap = canvasWidth / bufferLength
  const result = []

  for (let i = 1; i < bufferLength; i++) {
    const percent = dataArray[i] / 255
    lineHeight = (canvasHeight * percent) / 2

    result.push({ x, lineHeight })

    x += lineGap + 2
  }

  self.postMessage(result)
}
