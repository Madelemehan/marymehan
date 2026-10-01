/* MARY MEHAN — site content
   Everything the site shows comes from here. It's a .js file (not .json) so it
   also works when a page is opened straight from disk; keep it JSON-shaped:
   double-quoted keys and strings, no trailing commas, no code. */

window.MM_DATA = {
  "site": {
    "name": "mary mehan",
    "tagline": "Design · Strategy · Direction",
    "email": "hello@marymehan.com",
    "location": "New York, NY",
    "menuFoot": "mary mehan — portfolio 2026",
    "nav": [
      {
        "id": "home",
        "label": "Home",
        "href": "index.html",
        "icon": "home"
      },
      {
        "id": "projects",
        "label": "Projects",
        "href": "projects.html",
        "icon": "heart"
      },
      {
        "id": "resume",
        "label": "Resume",
        "href": "resume.html",
        "icon": "person"
      },
      {
        "id": "store",
        "label": "Store",
        "href": "store/index.html",
        "icon": "bag"
      },
      {
        "id": "control",
        "label": "Control",
        "href": "control.html",
        "icon": "clock"
      }
    ],
    "footer": {
      "copyright": "© 2026 Mary Mehan. All rights reserved.",
      "note": "Built with intent. No cookies, no tracking."
    }
  },
  "home": {
    "title": "mary mehan — portfolio",
    "hero": [
      {
        "title": [
          "Dedication",
          "and Magic"
        ],
        "image": "img/hero-4.jpg",
        "position": "center 55%",
        "dim": true
      }
    ],
    "selectedWork": {
      "heading": "Selected Work",
      "count": 5,
      "more": {
        "label": "View all",
        "href": "projects.html"
      }
    },
    "explore": {
      "heading": "Explore",
      "tiles": [
        {
          "label": "Projects",
          "sub": "Case studies & selected work",
          "href": "projects.html"
        },
        {
          "label": "Resume",
          "sub": "Experience · Skills · Contact",
          "href": "resume.html"
        }
      ]
    },
    "statement": {
      "kicker": "About",
      "text": "Work that holds its shape. Mary Mehan builds identities, interfaces, and stories with an editorial hand and an engineer's patience.",
      "cta": {
        "label": "Get in touch",
        "href": "resume.html"
      }
    }
  },
  "projects": {
    "title": "Projects — mary mehan",
    "heading": "Projects",
    "allLabel": "All",
    "items": [
      {
        "name": "Will We See a UFO in Our Lifetime?",
        "cat": "Data Analytics",
        "year": "2026",
        "role": "Research & Analysis",
        "tone": "t-dark",
        "href": "https://docs.google.com/presentation/d/1fIoBhxzarME9IrqiJumE7O31YF--njdriZYRxvHLkfY/edit"
      },
      {
        "name": "Meridian Rebrand",
        "cat": "Identity",
        "year": "2026",
        "role": "Creative Direction",
        "tone": "t-1"
      },
      {
        "name": "Atlas Field Guide",
        "cat": "Editorial",
        "year": "2025",
        "role": "Design & Layout",
        "tone": "t-dark"
      },
      {
        "name": "Norr Commerce",
        "cat": "Digital",
        "year": "2025",
        "role": "UX / UI",
        "tone": "t-2"
      },
      {
        "name": "Hollow Light",
        "cat": "Photography",
        "year": "2024",
        "role": "Art Direction",
        "tone": "t-3"
      },
      {
        "name": "Civic Type System",
        "cat": "Identity",
        "year": "2024",
        "role": "Type Design",
        "tone": "t-4"
      },
      {
        "name": "Paper Weather",
        "cat": "Editorial",
        "year": "2023",
        "role": "Concept & Design",
        "tone": "t-dark"
      }
    ]
  },
  "resume": {
    "title": "Resume — mary mehan",
    "heading": "Resume",
    "sub": "Experience · Education · Skills",
    "sections": [
      {
        "heading": "Experience",
        "items": [
          {
            "when": "2023 — Now",
            "title": "Senior Designer",
            "org": "Studio Meridian — New York",
            "text": "Lead designer on brand and digital engagements. Directed the Meridian rebrand across print, packaging, and web; managed a team of three designers."
          },
          {
            "when": "2020 — 2023",
            "title": "Designer",
            "org": "Norr & Co — Brooklyn",
            "text": "Designed e-commerce experiences and editorial systems for retail and publishing clients. Shipped Norr Commerce, a full storefront redesign."
          },
          {
            "when": "2018 — 2020",
            "title": "Junior Designer",
            "org": "Paper Weather Press",
            "text": "Production and layout for a quarterly print journal; built the studio's first type specimen library."
          }
        ]
      },
      {
        "heading": "Education",
        "items": [
          {
            "when": "2014 — 2018",
            "title": "BFA, Graphic Design",
            "org": "Rhode Island School of Design"
          }
        ]
      },
      {
        "heading": "Skills",
        "tags": [
          "Brand Identity",
          "Editorial Design",
          "Art Direction",
          "Typography",
          "UX / UI",
          "Figma",
          "Adobe CC",
          "HTML / CSS",
          "Print Production"
        ]
      }
    ],
    "contactHeading": "Contact",
    "actions": {
      "email": "Email me",
      "print": "Print / PDF"
    }
  },
  "store": {
    "taglines": [
      "Work that holds its shape.",
      "Made slowly, meant to stay.",
      "Paper, pigment, patience.",
      "Small editions. Long lives.",
      "Signed, numbered, and finished by hand.",
      "Quiet work for loud rooms.",
      "Every edge considered.",
      "From the studio wall to yours."
    ],
    "categories": [
      {
        "id": "originals",
        "name": "Originals",
        "description": "One-of-one paintings, drawings, and collage"
      },
      {
        "id": "prints",
        "name": "Prints",
        "description": "Limited-edition risograph and giclée prints"
      },
      {
        "id": "photography",
        "name": "Photography",
        "description": "Archival pigment prints, signed and numbered"
      },
      {
        "id": "editions",
        "name": "Editions",
        "description": "Zines, posters, and printed matter"
      }
    ],
    "products": [
      {
        "id": "o1",
        "name": "Quiet Interval No. 3",
        "category": "originals",
        "price": 2400.0,
        "description": "Layered fields of warm gray and bone, built up over months. A study in how little a surface needs to hold a room.",
        "features": [
          "Acrylic on stretched canvas",
          "30 × 40 in",
          "Signed and dated on verso",
          "Ready to hang, unframed",
          "Certificate of authenticity"
        ],
        "tone": "t-1",
        "stock": 1,
        "badge": "One of One"
      },
      {
        "id": "o2",
        "name": "Field Study (Graphite)",
        "category": "originals",
        "price": 950.0,
        "description": "A dense graphite drawing made on location over a single afternoon, all contour and shadow.",
        "features": [
          "Graphite on cotton rag paper",
          "18 × 24 in",
          "Signed lower right",
          "Ships flat, archival sleeve",
          "Certificate of authenticity"
        ],
        "tone": "t-3",
        "stock": 1
      },
      {
        "id": "o3",
        "name": "Margin Notes",
        "category": "originals",
        "price": 1200.0,
        "description": "Collage built from proof sheets, offcuts, and annotated drafts from the Atlas Field Guide.",
        "features": [
          "Mixed media collage on board",
          "16 × 20 in",
          "Signed on verso",
          "Framed in natural oak",
          "Certificate of authenticity"
        ],
        "tone": "t-dark",
        "stock": 1
      },
      {
        "id": "p1",
        "name": "Meridian Type Specimen",
        "category": "prints",
        "price": 65.0,
        "description": "The full Meridian alphabet set as a two-color risograph print. Each sheet varies slightly in registration.",
        "features": [
          "Two-color risograph",
          "11 × 17 in",
          "Edition of 100",
          "Signed and numbered",
          "Ships rolled in a tube"
        ],
        "tone": "t-2",
        "stock": 64,
        "badge": "New"
      },
      {
        "id": "p2",
        "name": "Atlas Contour Map",
        "category": "prints",
        "price": 140.0,
        "originalPrice": 180.0,
        "description": "Topographic linework from the Atlas Field Guide, enlarged and printed on heavyweight matte stock.",
        "features": [
          "Giclée on 310gsm cotton rag",
          "18 × 24 in",
          "Edition of 50",
          "Signed and numbered",
          "Ships rolled in a tube"
        ],
        "tone": "t-4",
        "stock": 8,
        "badge": "Sale"
      },
      {
        "id": "ph1",
        "name": "Off the Clock",
        "category": "photography",
        "price": 380.0,
        "description": "A fireplace, late in the evening. Shot on a quiet night away from the studio and printed in deep, soft blacks.",
        "features": [
          "Archival pigment print",
          "16 × 20 in",
          "Edition of 25",
          "Signed and numbered on verso",
          "Ships flat, unframed"
        ],
        "image": "../img/hero-4.jpg",
        "stock": 19,
        "badge": "Best Seller"
      },
      {
        "id": "ph2",
        "name": "Hollow Light I",
        "category": "photography",
        "price": 420.0,
        "description": "The first frame from the Hollow Light series: an empty room, one window, an hour before dark.",
        "features": [
          "Archival pigment print",
          "20 × 24 in",
          "Edition of 15",
          "Signed and numbered on verso",
          "Ships flat, unframed"
        ],
        "tone": "t-3",
        "stock": 6
      },
      {
        "id": "e1",
        "name": "Paper Weather, Issue 04",
        "category": "editions",
        "price": 28.0,
        "description": "The fourth issue of the quarterly journal: essays, field notes, and type experiments, 72 pages.",
        "features": [
          "72 pages, perfect bound",
          "6 × 9 in",
          "Offset printed",
          "Run of 500"
        ],
        "tone": "t-dark",
        "stock": 140
      },
      {
        "id": "e2",
        "name": "Civic Type Poster Set",
        "category": "editions",
        "price": 90.0,
        "description": "Three posters from the Civic Type System, printed as a set and wrapped in a folded paper band.",
        "features": [
          "Set of three posters",
          "12 × 18 in each",
          "Offset on uncoated stock",
          "Ships rolled in a tube"
        ],
        "tone": "t-1",
        "stock": 35
      }
    ]
  }
};
