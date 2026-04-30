export const LIMITS = {
  free: {
    boards: 3,
    cardsPerCanvas: 30,
    totalCanvases: 10,
    connectionsPerCanvas: 30,
    storageMB: 20,
  },
  pro: {
    boards: Infinity,
    cardsPerCanvas: Infinity,
    totalCanvases: Infinity,
    connectionsPerCanvas: Infinity,
    storageMB: 100,
  },
  god: {
    boards: Infinity,
    cardsPerCanvas: Infinity,
    totalCanvases: Infinity,
    connectionsPerCanvas: Infinity,
    storageMB: Infinity,
  },
}

export function getLimits(plan) {
  return LIMITS[plan] ?? LIMITS.free
}

export function isUnlimited(plan) {
  return plan === 'pro' || plan === 'god'
}

// Count total canvases (boards + all folder cards across loaded db)
export function countTotalCanvases(boards, db) {
  let count = boards.length
  for (const canvas of Object.values(db)) {
    if (!canvas?.cards) continue
    count += canvas.cards.filter(c => c.isFolder).length
  }
  return count
}
