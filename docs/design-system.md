# HeyValla colour system

User-approved app palette:

| Token | Hex | Use |
| --- | --- | --- |
| Lagoon teal | #087F8C | Main buttons, links and active controls |
| Warm sand | #FAF7F0 | Page background |
| Coconut white | #FFFFFF | Cards and input fields |
| Deep ocean | #12343B | Headings and body text |
| Sunset coral | #F28C78 | Small accents and highlights |

Transport mode colours (hues specified by the user; exact mode hex values chosen for implementation):

| Mode | Hex | Appearance |
| --- | --- | --- |
| Flight | #8ED6F3 | Light blue; dark text on badges |
| Sea/ferry | #1E3A8A | Dark blue; white text on badges |
| Land transfer | #F59E0B | Orange; dark text on badges |
| Taxi | #000000 | Black; white text on badges |
| Bus | #15803D | Green; white text on badges |

Semantic Tailwind colour tokens are declared in `frontend/src/app/globals.css`. Map mode colours are in `frontend/src/lib/transport-colors.ts`. Use mode colour for transport identity; use text/status labels as well, not colour alone. Selection uses marker size/line weight and deep-ocean contrast so orange is reserved for land rather than highlighting sea lines. Residential island reference dots use lagoon and resort dots use coral; these are location categories, not transport modes.

Transport colours are applied to map airport markers and sea routes, the mode legend, ferry result badges, land transfer badges, taxi screens and the green RTL bus catalogue. Error states may retain distinct error styling. Main buttons remain lagoon irrespective of mode.
