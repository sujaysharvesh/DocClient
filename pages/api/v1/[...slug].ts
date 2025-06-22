import type { NextApiRequest, NextApiResponse } from 'next'
import httpProxy from 'http-proxy'
import Cookies from 'cookies'
import url from 'url'

const API_URL = process.env.API_URL // e.g. http://localhost:4005
console.log("api url:", API_URL)
const proxy = httpProxy.createProxyServer()

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise<void>((resolve, reject) => {
    const pathname = url.parse(req.url || '').pathname || ''
    const isLogin = pathname === '/api/v1/login'

    const cookies = new Cookies(req, res)
    const authToken = cookies.get('jwt-token') // Read from cookie

    req.url = req.url?.replace(/^\/api/, '/api') || ''
    req.headers.cookie = '' // Prevent cookie from being sent to backend

    if (authToken) {
      req.headers['Authorization'] = `Bearer ${authToken}`
    }

    if (isLogin) {
      proxy.once('proxyRes', (proxyRes) =>
        interceptLoginResponse(proxyRes, req, res, resolve, reject)
      )
    }

    proxy.once('error', reject)

    proxy.web(req, res, {
      target: API_URL,
      autoRewrite: false,
      changeOrigin: true,
      selfHandleResponse: isLogin,
    })
  })
}

function interceptLoginResponse(
  proxyRes: any,
  req: NextApiRequest,
  res: NextApiResponse,
  resolve: () => void,
  reject: (reason?: any) => void
) {
  let body = ''

  proxyRes.on('data', (chunk: Buffer) => {
    body += chunk.toString('utf8')
  })

  proxyRes.on('end', () => {
    try {
      const parsed = JSON.parse(body)
      const token = parsed.token || parsed.authToken

      if (!token) throw new Error('Token not found in response')

      const cookies = new Cookies(req, res)
      cookies.set('jwt-token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 86400, // 1 day
        secure: false, // set true in prod (with https)
      })

      res.status(200).json({ loggedIn: true })
      resolve()
    } catch (err) {
      reject(err)
    }
  })
}
