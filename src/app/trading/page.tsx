import { redirect } from 'next/navigation'

export default function TradingPage() {
  // Redirect to Trade Management as the main trading page
  redirect('/trading/trade-management')
} 