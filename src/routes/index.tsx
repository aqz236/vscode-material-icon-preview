import { createFileRoute } from '@tanstack/react-router'
import IconGrid from '../components/IconGrid'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <IconGrid />
    </div>
  )
}
