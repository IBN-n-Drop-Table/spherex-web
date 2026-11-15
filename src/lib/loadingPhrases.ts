// Copy of the backend's GET /loading-phrases: used when the server has not answered yet (it may be
// the very request that is slow) or is down. The server's own list replaces it once it arrives.
// Ambience only: none of these says anything about the real state of a job, and none claims a finding.
export type PhraseCategory = 'generic' | 'cold_start' | 'subtraction' | 'game' | 'chat'
export type LoadingPhrases = Record<PhraseCategory, string[]>

export const LOCAL_PHRASES: LoadingPhrases = {
  "generic": [
    "Warming up the telescope. It's very cold up there.",
    "Counting photons one by one. Please hold.",
    "Asking the universe to hold still for a second.",
    "Polishing a mirror we definitely don't own.",
    "Convincing light to arrive faster. It's not listening.",
    "Dusting off 102 infrared colors.",
    "Aligning the stars. Some are being difficult.",
    "Loading the cosmos. It's a big file."
  ],
  "cold_start": [
    "Our server is waking up. It doesn't do mornings either.",
    "Brewing coffee for the backend. Almost ready.",
    "The API is stretching. Great things need warm-ups."
  ],
  "subtraction": [
    "Subtracting the stars that stayed. Looking for the ones that sneaked away.",
    "Spot the difference. Sometimes the difference moves.",
    "Hunting things that move while pretending not to.",
    "Making the boring stars disappear."
  ],
  "game": [
    "Shuffling the sky. No cheating, we checked.",
    "Hiding something in the stars. Good luck.",
    "Your 1930 astronomer moment is loading."
  ],
  "chat": [
    "Asking a very smart parrot who has read a lot of astronomy.",
    "Thinking in infrared. It takes a second.",
    "Finding words simpler than \"parallax\"."
  ]
}
