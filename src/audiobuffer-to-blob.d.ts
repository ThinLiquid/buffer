declare module 'audiobuffer-to-blob' {
  export default function audioBufferToBlob (
    buffer: AudioBuffer,
    type?: string
  ): Blob
}
