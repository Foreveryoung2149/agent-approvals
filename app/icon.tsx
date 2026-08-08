import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#c8e64a',
          color: '#050505',
          borderRadius: '7px',
          fontWeight: 800,
          fontSize: '20px',
          fontFamily: 'monospace',
        }}
      >
        N
      </div>
    ),
    { ...size }
  )
}
