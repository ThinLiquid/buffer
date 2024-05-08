export function getWavBytes (buffer: ArrayBuffer, options: any): Uint8Array {
  const type = options.isFloat === true ? Float32Array : Uint16Array
  const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT

  const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }))
  const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength)

  // prepend header, then add pcmBytes
  wavBytes.set(headerBytes, 0)
  wavBytes.set(new Uint8Array(buffer), headerBytes.length)

  return wavBytes
}

// adapted from https://gist.github.com/also/900023
// returns Uint8Array of WAV header bytes
export function getWavHeader (options: any): Uint8Array {
  const { numFrames } = options
  const numChannels = options.numChannels !== undefined ? options.numChannels : 2
  const sampleRate = options.sampleRate === undefined ? 44100 : options.sampleRate
  const bytesPerSample = options.isFloat === true ? 4 : 2
  const format = options.isFloat === true ? 3 : 1

  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign

  const buffer = new ArrayBuffer(44)
  const dv = new DataView(buffer)

  let p = 0

  function writeString (s: string): void {
    for (let i = 0; i < s.length; i++) {
      dv.setUint8(p + i, s.charCodeAt(i))
    }
    p += s.length
  }

  function writeUint32 (d: number): void {
    dv.setUint32(p, d, true)
    p += 4
  }

  function writeUint16 (d: number): void {
    dv.setUint16(p, d, true)
    p += 2
  }

  writeString('RIFF') // ChunkID
  writeUint32(dataSize + 36) // ChunkSize
  writeString('WAVE') // Format
  writeString('fmt ') // Subchunk1ID
  writeUint32(16) // Subchunk1Size
  writeUint16(format) // AudioFormat https://i.stack.imgur.com/BuSmb.png
  writeUint16(numChannels) // NumChannels
  writeUint32(sampleRate) // SampleRate
  writeUint32(byteRate) // ByteRate
  writeUint16(blockAlign) // BlockAlign
  writeUint16(bytesPerSample * 8) // BitsPerSample
  writeString('data') // Subchunk2ID
  writeUint32(dataSize) // Subchunk2Size

  return new Uint8Array(buffer)
}

export async function arrayBufferToWav (audioCtx: AudioContext, buffer: ArrayBuffer): Promise<Blob> {
  const audioBuffer = await audioCtx.decodeAudioData(buffer)
  const [left, right] = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)]

  // Interleaved
  const interleaved = new Float32Array(left.length + right.length)
  for (let src = 0, dst = 0; src < left.length; src++, dst += 2) {
    interleaved[dst] = left[src]
    interleaved[dst + 1] = right[src]
  }

  // Get WAV file bytes and audio params of your audio source
  const wavBytes = getWavBytes(interleaved.buffer, {
    isFloat: true, // Floating point or 16-bit integer
    numChannels: 2,
    sampleRate: 48000
  })
  return new Blob([wavBytes], { type: 'audio/wav' })
}
