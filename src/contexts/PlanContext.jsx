import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getLimits } from '../lib/plans'

const PlanContext = createContext({ plan: 'free', limits: getLimits('free') })

export function PlanProvider({ userId, children }) {
  const [plan, setPlan] = useState('free')

  useEffect(() => {
    if (!userId || userId === 'local') return
    supabase.from('profiles').select('plan').eq('id', userId).single()
      .then(({ data }) => { if (data?.plan) setPlan(data.plan) })
  }, [userId])

  return (
    <PlanContext.Provider value={{ plan, limits: getLimits(plan) }}>
      {children}
    </PlanContext.Provider>
  )
}

export const usePlan = () => useContext(PlanContext)
