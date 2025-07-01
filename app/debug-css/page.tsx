export default function DebugCSSPage() {
  return (
    <html lang="es">
      <head>
        <title>Debug CSS</title>
        <style>{`
          .test-styles {
            background-color: #ef4444;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px;
          }
        `}</style>
      </head>
      <body>
        <div className="test-styles">
          <h1>Inline CSS Test - This should be RED</h1>
        </div>
        
        <div className="bg-blue-500 text-white p-4 m-4 rounded">
          <h2>Tailwind CSS Test - This should be BLUE</h2>
          <p className="text-yellow-300">This text should be yellow</p>
        </div>
        
        <div style={{backgroundColor: '#10b981', color: 'white', padding: '16px', margin: '16px', borderRadius: '8px'}}>
          <h3>Inline Style Test - This should be GREEN</h3>
        </div>
      </body>
    </html>
  )
}