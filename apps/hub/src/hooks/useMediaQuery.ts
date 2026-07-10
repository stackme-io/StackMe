import { useEffect, useState } from 'react'

// Subscribes to a CSS media query and re-renders on change. SSR-safe (defaults
// to false until mounted). Width drives layout; pair with feature detection
// (e.g. showDirectoryPicker) for capability decisions.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

// True below Tailwind's md breakpoint (< 768px) - the mobile layout cutoff.
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
