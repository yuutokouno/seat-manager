import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Profile = {
  id: string
  name: string | null
  avatar_url: string | null
  role: string
}

type UserTableProps = {
  currentUserId: string
}

export function UserTable({ currentUserId }: UserTableProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, role')
      .order('name')

    setProfiles(data ?? [])
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const toggleRole = async (profile: Profile) => {
    if (profile.id === currentUserId) {
      alert('自分の権限は変更できません')
      return
    }

    const newRole = profile.role === 'admin' ? 'member' : 'admin'

    if (!window.confirm(
      newRole === 'admin'
        ? `${profile.name ?? '不明'} を管理者にしますか？`
        : `${profile.name ?? '不明'} の管理者権限を外しますか？`
    )) return

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profile.id)

    if (error) {
      alert('権限の変更に失敗しました')
      return
    }

    fetchProfiles()
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-3">
            {profile.avatar_url && (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
            )}
            <div>
              <p className="font-medium text-sm">{profile.name ?? '不明'}</p>
              <p className="text-xs text-gray-400">
                {profile.role === 'admin' ? '管理者' : 'メンバー'}
              </p>
            </div>
          </div>
          {profile.id === currentUserId ? (
            <span className="text-xs text-gray-500">自分</span>
          ) : (
            <button
              onClick={() => toggleRole(profile)}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                profile.role === 'admin'
                  ? 'text-red-400 hover:bg-red-400/10'
                  : 'text-blue-400 hover:bg-blue-400/10'
              }`}
            >
              {profile.role === 'admin' ? '権限を外す' : '管理者にする'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
