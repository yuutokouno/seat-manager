import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirect}`,
      },
    })

    if (error) {
      console.error('Login failed:', error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-6">Seat Manager</h1>
        <button
          onClick={handleGoogleLogin}
          className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Google でログイン
        </button>
      </div>
    </div>
  )
}
