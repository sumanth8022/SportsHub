import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'SportsHub',
        short_name: 'SportsHub',
        description: 'SportsHub sports, parks and stadium booking application',

        theme_color: '#ffffff',
        background_color: '#ffffff',

        display: 'standalone',
        start_url: '/',
        scope: '/',

        icons: [
          {
            src: '/sportshub-logo.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/sportshub-logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ]
})