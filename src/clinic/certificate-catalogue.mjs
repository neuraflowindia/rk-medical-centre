// Client-supplied certificates. Descriptive labels do not add qualifications.
// Ten approved selections; true pixel widths are used for portrait srcset.
export const certificateCatalogue=Object.freeze([
  {
    "id": "sanjay-gupta-certificate-03",
    "doctor": "sanjay",
    "title": "Diabetes association membership",
    "issuer": "Life membership · UPDA",
    "description": "Uttar Pradesh Diabetes Association life membership certificate",
    "variants": [
      {
        "src": "/certificates/sanjay-gupta-certificate-03-480.webp",
        "width": 357,
        "height": 480
      },
      {
        "src": "/certificates/sanjay-gupta-certificate-03-720.webp",
        "width": 536,
        "height": 720
      }
    ]
  },
  {
    "id": "parul-gupta-certificate-01",
    "doctor": "parul",
    "title": "Obstetrics and gynaecology fellowship",
    "issuer": "ICOG · 2022",
    "description": "Fellowship certificate from the Indian College of Obstetricians and Gynaecologists, 2022",
    "variants": [
      {
        "src": "/certificates/parul-gupta-certificate-01-480.webp",
        "width": 480,
        "height": 360
      },
      {
        "src": "/certificates/parul-gupta-certificate-01-720.webp",
        "width": 720,
        "height": 540
      }
    ]
  },
  {
    "id": "sanjay-gupta-certificate-08",
    "doctor": "sanjay",
    "title": "Clinical diabetology course",
    "issuer": "Harvard Medical School · 2016",
    "description": "Harvard Medical School clinical diabetology educational activity certificate, 2016",
    "variants": [
      {
        "src": "/certificates/sanjay-gupta-certificate-08-480.webp",
        "width": 480,
        "height": 320
      },
      {
        "src": "/certificates/sanjay-gupta-certificate-08-720.webp",
        "width": 720,
        "height": 480
      }
    ]
  },
  {
    "id": "parul-gupta-certificate-02",
    "doctor": "parul",
    "title": "Maternal and child health fellowship",
    "issuer": "ICMCH · 2018",
    "description": "Fellowship certificate from the Indian College of Maternal & Child Health, 2018",
    "variants": [
      {
        "src": "/certificates/parul-gupta-certificate-02-480.webp",
        "width": 480,
        "height": 360
      },
      {
        "src": "/certificates/parul-gupta-certificate-02-720.webp",
        "width": 720,
        "height": 540
      }
    ]
  },
  {
    "id": "sanjay-gupta-certificate-01",
    "doctor": "sanjay",
    "title": "Physicians’ association membership",
    "issuer": "Life membership · API Lucknow",
    "description": "Life membership certificate from the Association of Physicians of India, Lucknow branch",
    "variants": [
      {
        "src": "/certificates/sanjay-gupta-certificate-01-480.webp",
        "width": 357,
        "height": 480
      },
      {
        "src": "/certificates/sanjay-gupta-certificate-01-720.webp",
        "width": 535,
        "height": 720
      }
    ]
  },
  {
    "id": "parul-gupta-certificate-05",
    "doctor": "parul",
    "title": "High-risk pregnancy course",
    "issuer": "ACOG · 2021",
    "description": "American College of Obstetricians and Gynecologists high-risk pregnancy self-assessment course completion certificate, 2021",
    "variants": [
      {
        "src": "/certificates/parul-gupta-certificate-05-480.webp",
        "width": 480,
        "height": 360
      },
      {
        "src": "/certificates/parul-gupta-certificate-05-720.webp",
        "width": 720,
        "height": 540
      }
    ]
  },
  {
    "id": "sanjay-gupta-certificate-06",
    "doctor": "sanjay",
    "title": "Cardiac Care Masterclass",
    "issuer": "Course participation · 2025",
    "description": "Cardiac Care Masterclass participation certificate, 2025",
    "variants": [
      {
        "src": "/certificates/sanjay-gupta-certificate-06-480.webp",
        "width": 480,
        "height": 270
      },
      {
        "src": "/certificates/sanjay-gupta-certificate-06-720.webp",
        "width": 720,
        "height": 405
      }
    ]
  },
  {
    "id": "parul-gupta-certificate-03",
    "doctor": "parul",
    "title": "Contribution to healthcare award",
    "issuer": "Women’s Day · 2026",
    "description": "Certificate for Outstanding Contribution to Healthcare, Women’s Day 2026",
    "variants": [
      {
        "src": "/certificates/parul-gupta-certificate-03-480.webp",
        "width": 480,
        "height": 360
      },
      {
        "src": "/certificates/parul-gupta-certificate-03-720.webp",
        "width": 720,
        "height": 540
      }
    ]
  },
  {
    "id": "sanjay-gupta-certificate-02",
    "doctor": "sanjay",
    "title": "World Hypertension Day appreciation",
    "issuer": "17 May 2023",
    "description": "World Hypertension Day certificate of appreciation, 17 May 2023",
    "variants": [
      {
        "src": "/certificates/sanjay-gupta-certificate-02-480.webp",
        "width": 480,
        "height": 270
      },
      {
        "src": "/certificates/sanjay-gupta-certificate-02-720.webp",
        "width": 720,
        "height": 405
      }
    ]
  },
  {
    "id": "parul-gupta-certificate-04",
    "doctor": "parul",
    "title": "Physiology proficiency certificate",
    "issuer": "King George’s Medical College · Lucknow",
    "description": "Physiology proficiency certificate from King George’s Medical College, Lucknow",
    "variants": [
      {
        "src": "/certificates/parul-gupta-certificate-04-480.webp",
        "width": 480,
        "height": 360
      },
      {
        "src": "/certificates/parul-gupta-certificate-04-720.webp",
        "width": 720,
        "height": 540
      }
    ]
  }
].map(item=>Object.freeze({...item,variants:Object.freeze(item.variants.map(Object.freeze))})));
export function certificatesFor(doctor='mixed'){return doctor==='mixed'?certificateCatalogue:certificateCatalogue.filter(item=>item.doctor===doctor);}
