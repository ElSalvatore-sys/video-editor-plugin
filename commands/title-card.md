---
description: Create an animated title card video using Remotion — usage: /title-card "<text>" [--bg #000000] [--fg #ffffff] [--duration 3]
---

# /title-card

Generate an animated title card as an MP4 using Remotion (React-based rendering).

**Usage:** `/title-card "<text>" [--bg <hex>] [--fg <hex>] [--duration <seconds>]`

**Defaults:** black background (`#000000`), white text (`#ffffff`), 3 seconds, 1920×1080, 30fps

**Examples:**
- `/title-card "Chapter 1"`
- `/title-card "The Beginning" --bg "#1a1a2e" --fg "#e0aaff" --duration 5`

## Steps

1. Parse the title text and optional flags. Ask for text if not provided.

2. Check Node.js:
   ```bash
   node --version
   ```
   If missing: "Install Node.js from https://nodejs.org or `brew install node`"

3. Create a temp Remotion project:
   ```bash
   RENDER_DIR=/tmp/remotion-titlecard-$(date +%s)
   mkdir -p $RENDER_DIR/src
   cd $RENDER_DIR
   npm init -y --silent
   npm install --silent remotion @remotion/cli react react-dom typescript @types/react
   ```

4. Write `$RENDER_DIR/src/TitleCard.tsx`:
   ```tsx
   import React from 'react';
   import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

   interface Props { text: string; bg: string; fg: string; }

   export const TitleCard: React.FC<Props> = ({ text, bg, fg }) => {
     const frame = useCurrentFrame();
     const { fps } = useVideoConfig();
     const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 200 } });
     const translateY = spring({ frame, fps, from: 40, to: 0, config: { damping: 100 } });
     return (
       <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
         <h1 style={{
           color: fg,
           fontSize: 96,
           fontFamily: 'sans-serif',
           fontWeight: 800,
           opacity,
           transform: `translateY(${translateY}px)`,
           textAlign: 'center',
           padding: '0 60px',
         }}>
           {text}
         </h1>
       </AbsoluteFill>
     );
   };
   ```

5. Write `$RENDER_DIR/src/Root.tsx`:
   ```tsx
   import React from 'react';
   import { Composition } from 'remotion';
   import { TitleCard } from './TitleCard';

   export const RemotionRoot: React.FC = () => (
     <Composition
       id="TitleCard"
       component={TitleCard}
       durationInFrames={30 * <duration>}
       fps={30}
       width={1920}
       height={1080}
       defaultProps={{ text: '<text>', bg: '<bg>', fg: '<fg>' }}
     />
   );
   ```

6. Write `$RENDER_DIR/src/index.ts`:
   ```ts
   import { registerRoot } from 'remotion';
   import { RemotionRoot } from './Root';
   registerRoot(RemotionRoot);
   ```

7. Write `$RENDER_DIR/tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "jsx": "react",
       "esModuleInterop": true,
       "module": "commonjs",
       "target": "es6",
       "strict": false
     }
   }
   ```

8. Render:
   ```bash
   cd $RENDER_DIR
   npx remotion render src/index.ts TitleCard title_card_output.mp4
   ```

9. Move output to the user's current working directory:
   ```bash
   mv $RENDER_DIR/title_card_output.mp4 ./title_card_output.mp4
   ```

10. Report: output path and file size.

11. Offer next step:
    > "Title card saved to `title_card_output.mp4`. To prepend it to another video:
    > `/merge title_card_output.mp4 your_video.mp4 --transition fade`"
