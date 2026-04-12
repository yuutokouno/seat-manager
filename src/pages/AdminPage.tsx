import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSeats } from '../hooks/useSeats'
import { useLabels } from '../hooks/useLabels'
import { SeatForm } from '../components/admin/SeatForm'
import { SeatTable } from '../components/admin/SeatTable'
import { LabelForm } from '../components/admin/LabelForm'
import { LabelTable } from '../components/admin/LabelTable'
import { LayoutEditor } from '../components/admin/LayoutEditor'
import { UserTable } from '../components/admin/UserTable'

type Tab = 'seats' | 'layout' | 'users'

export function AdminPage() {
  const { user, role, isLoading } = useAuth()
  const { seats, isLoading: isSeatsLoading, refetch } = useSeats()
  const { labels, refetchLabels } = useLabels()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('seats')

  const refetchAll = () => {
    refetch()
    refetchLabels()
  }

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/')
    }
    if (!isLoading && user && role !== null && role !== 'admin') {
      navigate('/')
    }
  }, [isLoading, user, role, navigate])

  if (isLoading || isSeatsLoading || (user && role === null)) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  if (!user || role !== 'admin') return null

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">管理画面</h1>
        <Link to="/" className="text-gray-400 text-sm hover:text-white transition-colors">
          フロアマップに戻る
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('seats')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'seats' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          席の管理
        </button>
        <button
          onClick={() => setActiveTab('layout')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'layout' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          レイアウト
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'users' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          ユーザー
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'seats' ? (
        <>
          <h2 className="text-sm font-medium text-gray-400 mb-3">席</h2>
          <SeatForm onAdded={refetch} />
          <SeatTable seats={seats} onDeleted={refetch} />

          <h2 className="text-sm font-medium text-gray-400 mt-8 mb-3">ラベル</h2>
          <LabelForm onAdded={refetchLabels} />
          <LabelTable labels={labels} onDeleted={refetchLabels} />
        </>
      ) : activeTab === 'layout' ? (
        <LayoutEditor seats={seats} labels={labels} onSaved={refetchAll} />
      ) : (
        <UserTable currentUserId={user.id} />
      )}
    </div>
  )
}
