import React from 'react'
import { SalesActivityForm } from './SalesActivityForm'

type Activity = {
  id: number
  subject?: string
  description?: string
  activityType?: string
  activityStatus?: string
  channel?: string
  plannedStartAt?: string
  plannedEndAt?: string
  createdAt?: string
  sfAccountId?: string
  customerName?: string
  parentSeq?: number
  parentSubject?: string
}

export function MyActivitiesNewTabs({ activity }: { activity?: Activity }) {
  return (
    <section className="card activity-edit-panel" style={{ marginTop: 12, minHeight: 240 }}>
      <div className="tabs c360-tabs">
        <button className={'tab active'}>영업활동 변경</button>
      </div>
      <div className="activity-form-wrapper">
        <SalesActivityForm
          key={`edit-${activity?.id ?? 'new'}`}
          bare
          editId={activity?.id}
        initial={{
          id: activity?.id,
          subject: activity?.subject || '',
          description: activity?.description || '',
          channel: activity?.channel || 'in_person',
          activityType: activity?.activityType || 'site_visit',
          activityStatus: activity?.activityStatus || 'scheduled',
          plannedStartAt: activity?.plannedStartAt || '',
          plannedEndAt: activity?.plannedEndAt || '',
          sfAccountId: activity?.sfAccountId || '',
          customerName: (activity as any)?.customerName || '',
          parentActivitySeq: activity?.parentSeq,
          parentSubject: activity?.parentSubject
        }}
        />
      </div>
    </section>
  )
}
