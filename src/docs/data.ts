// Snapshots of orilos-mcp data: captions.describe() and the Piper voice catalogue (voice.languages()).

export const STYLES: { name: string; look: string; best_for: string }[] = [
 {
  "name": "bold",
  "look": "Huge Anton caps, yellow pop on the spoken word",
  "best_for": "Hooks, punchlines, any energy"
 },
 {
  "name": "hormozi",
  "look": "Heavy caps with drop shadow, yellow pop",
  "best_for": "Business, podcasts, advice"
 },
 {
  "name": "pill",
  "look": "Violet pill behind the spoken word",
  "best_for": "Podcasts, talking heads"
 },
 {
  "name": "lime",
  "look": "Lime pill behind the spoken word",
  "best_for": "Gaming, tech, Gen-Z"
 },
 {
  "name": "oneword",
  "look": "One giant word at a time",
  "best_for": "Fast hype edits"
 },
 {
  "name": "clean",
  "look": "Soft-shadow sentence case, no highlight",
  "best_for": "Explainers, interviews, brands"
 },
 {
  "name": "orilos",
  "look": "ORILOS Lit Glass: frosted dark bar, lime word, violet glow",
  "best_for": "Anything. Our signature look"
 },
 {
  "name": "orilos-neon",
  "look": "Violet neon glow, lime spoken word",
  "best_for": "Night streams, gaming"
 },
 {
  "name": "orilos-glass",
  "look": "Glass card, white words, violet spoken word box",
  "best_for": "Founders, product, brand"
 },
 {
  "name": "bold-pop",
  "look": "High-contrast caps, punchy pop-in blocks",
  "best_for": "Hooks and punchlines"
 },
 {
  "name": "beast",
  "look": "Massive bouncing caps, red spoken word",
  "best_for": "Challenges, reactions"
 },
 {
  "name": "reveal",
  "look": "Words appear as they're said",
  "best_for": "Storytelling hooks, suspense"
 },
 {
  "name": "shout",
  "look": "Shaking red caps",
  "best_for": "Rage moments, hype"
 },
 {
  "name": "impact",
  "look": "Archivo Black caps, orange pop",
  "best_for": "Sports, news, hot takes"
 },
 {
  "name": "headline",
  "look": "Tall Bebas caps, white on black box",
  "best_for": "News, facts, explainers"
 },
 {
  "name": "punch",
  "look": "Zooming blocks, cyan spoken word",
  "best_for": "Fast edits, montages"
 },
 {
  "name": "tayo",
  "look": "High-contrast black-on-yellow word box",
  "best_for": "Dynamic talking heads"
 },
 {
  "name": "boxed",
  "look": "Every spoken word in a white box",
  "best_for": "Tutorials, how-tos"
 },
 {
  "name": "redbox",
  "look": "Red box, white word",
  "best_for": "Breaking news, drama"
 },
 {
  "name": "karaoke",
  "look": "Smooth colour sweep through each line",
  "best_for": "Music, lyrics, singing"
 },
 {
  "name": "karaoke-glow",
  "look": "Glowing sweep in yellow",
  "best_for": "Fast social pacing"
 },
 {
  "name": "karaoke-pink",
  "look": "Pink sweep, soft shadow",
  "best_for": "Lifestyle, beauty"
 },
 {
  "name": "fill",
  "look": "Words fill green as they're said",
  "best_for": "Motivation, lists"
 },
 {
  "name": "progress",
  "look": "Words turn gold as spoken, cream base",
  "best_for": "Stories, history"
 },
 {
  "name": "neon",
  "look": "Neon tubes, pink glow",
  "best_for": "Nightlife, music, gaming"
 },
 {
  "name": "neon-blue",
  "look": "Electric blue glow",
  "best_for": "Tech, sci-fi, crypto"
 },
 {
  "name": "neon-green",
  "look": "Toxic green glow",
  "best_for": "Gaming, horror"
 },
 {
  "name": "cyber",
  "look": "Cyan/magenta duo with glow",
  "best_for": "Cyberpunk, tech, GTA nights"
 },
 {
  "name": "vice",
  "look": "Sunset pink and teal duo",
  "best_for": "GTA, Miami, retro"
 },
 {
  "name": "gamer",
  "look": "Lime glow, chunky caps",
  "best_for": "Gaming streams"
 },
 {
  "name": "arcade",
  "look": "8-bit pixel caps",
  "best_for": "Retro games, speedruns"
 },
 {
  "name": "esports",
  "look": "Black Ops stencil, red pop",
  "best_for": "FPS, esports, military"
 },
 {
  "name": "3d",
  "look": "Thick 3D drop in purple",
  "best_for": "Kids, entertainment"
 },
 {
  "name": "3d-red",
  "look": "Red 3D extrude",
  "best_for": "Hype, sports"
 },
 {
  "name": "comic",
  "look": "Comic-book caps, red 3D",
  "best_for": "Memes, funny moments"
 },
 {
  "name": "cartoon",
  "look": "Bubbly caps, blue shadow",
  "best_for": "Kids, cartoons, family"
 },
 {
  "name": "candy",
  "look": "Lilita, pink 3D, mint word",
  "best_for": "Lifestyle, food"
 },
 {
  "name": "retro",
  "look": "70s slab, orange shadow",
  "best_for": "Vintage, music, storytime"
 },
 {
  "name": "minimal",
  "look": "Small white sentence case, soft shadow",
  "best_for": "Explainers and demos"
 },
 {
  "name": "minimal-lower",
  "look": "all lowercase, quiet",
  "best_for": "Aesthetic, vlogs"
 },
 {
  "name": "subtitle",
  "look": "Classic subtitle line on a dark bar",
  "best_for": "Interviews, documentaries"
 },
 {
  "name": "spotlight",
  "look": "Only the spoken word at full brightness",
  "best_for": "Calm, premium talking heads"
 },
 {
  "name": "editorial",
  "look": "Slab serif, gold keyword",
  "best_for": "Creative, essays, culture"
 },
 {
  "name": "lifestyle",
  "look": "Rounded caps, peach word",
  "best_for": "Lifestyle, wellness"
 },
 {
  "name": "clean-box",
  "look": "White text on a soft black card",
  "best_for": "Corporate, LinkedIn"
 },
 {
  "name": "underline",
  "look": "Underlined spoken word",
  "best_for": "Education, tips"
 },
 {
  "name": "typewriter",
  "look": "Typewriter words appearing",
  "best_for": "Mystery, true crime, letters"
 },
 {
  "name": "story",
  "look": "Warm cream caps, amber word",
  "best_for": "Storytelling, podcasts"
 },
 {
  "name": "cozy",
  "look": "Soft rounded, coral pop",
  "best_for": "Vlogs, cooking"
 },
 {
  "name": "marker",
  "look": "Handwritten marker, yellow word",
  "best_for": "Hand-drawn, school, tips"
 },
 {
  "name": "script",
  "look": "Brush script, pink spoken word",
  "best_for": "Beauty, weddings, travel"
 },
 {
  "name": "horror",
  "look": "Dripping green caps",
  "best_for": "Horror games, scary stories"
 },
 {
  "name": "yellow",
  "look": "Classic white caps, yellow word",
  "best_for": "Everything"
 },
 {
  "name": "cyan",
  "look": "White caps, cyan word",
  "best_for": "Tech, science"
 },
 {
  "name": "red",
  "look": "White caps, red pop",
  "best_for": "Drama, sports"
 },
 {
  "name": "green",
  "look": "White caps, green pop",
  "best_for": "Money, finance, wins"
 },
 {
  "name": "purple",
  "look": "White caps, purple pop",
  "best_for": "Creators, music"
 },
 {
  "name": "orange",
  "look": "White caps, orange pop",
  "best_for": "Food, energy"
 },
 {
  "name": "pink",
  "look": "White caps, pink pop",
  "best_for": "Lifestyle, fashion"
 },
 {
  "name": "gold",
  "look": "Bebas caps, gold word",
  "best_for": "Luxury, real estate, motivation"
 },
 {
  "name": "blackout",
  "look": "Black text, white outline",
  "best_for": "Bright footage, outdoors"
 },
 {
  "name": "outline-swap",
  "look": "Spoken word gets a yellow outline",
  "best_for": "Podcasts with busy backgrounds"
 },
 {
  "name": "slide",
  "look": "Blocks slide up, yellow word",
  "best_for": "Explainers, lists"
 },
 {
  "name": "stack",
  "look": "Condensed stacks, lime keyword",
  "best_for": "Quotes, wisdom"
 },
 {
  "name": "duo",
  "look": "Alternating white and yellow words",
  "best_for": "Upbeat montages"
 },
 {
  "name": "fire",
  "look": "Hot orange glow",
  "best_for": "Hype moments, wins"
 },
 {
  "name": "ice",
  "look": "Icy blue glow",
  "best_for": "Calm, clean, chill"
 }
];

export const VOICE_LANGUAGES: [code: string, name: string][] = [["sq", "Albanian"], ["ar", "Arabic"], ["hy", "Armenian"], ["eu", "Basque"], ["bn", "Bengali"], ["bg", "Bulgarian"], ["ca", "Catalan"], ["zh", "Chinese"], ["cs", "Czech"], ["da", "Danish"], ["nl", "Dutch"], ["en", "English"], ["et", "Estonian"], ["fa", "Farsi"], ["fi", "Finnish"], ["fr", "French"], ["ka", "Georgian"], ["de", "German"], ["el", "Greek"], ["he", "Hebrew"], ["hi", "Hindi"], ["hu", "Hungarian"], ["is", "Icelandic"], ["id", "Indonesian"], ["it", "Italian"], ["ja", "Japanese"], ["kk", "Kazakh"], ["ko", "Korean"], ["ku", "Kurmanji Kurdish"], ["lv", "Latvian"], ["lt", "Lithuanian"], ["lb", "Luxembourgish"], ["ml", "Malayalam"], ["mr", "Marathi"], ["ne", "Nepali"], ["no", "Norwegian"], ["pl", "Polish"], ["pt", "Portuguese"], ["ro", "Romanian"], ["ru", "Russian"], ["sr", "Serbian"], ["sk", "Slovak"], ["sl", "Slovenian"], ["es", "Spanish"], ["sw", "Swahili"], ["sv", "Swedish"], ["te", "Telugu"], ["th", "Thai"], ["tr", "Turkish"], ["uk", "Ukrainian"], ["ur", "Urdu"], ["vi", "Vietnamese"], ["cy", "Welsh"]];
