/**
 * Integrated vaccine schedule database (27 vaccines)
 * Extracted from original app (lines 2608-2681)
 */
export const VACCINE_SCHEDULES = {
    'Adacel': { boosters: [] },
    'Adacel Polio': { boosters: [] },
    'Boostrix': { boosters: [] },
    'Boostrix polio': { boosters: [] },
    'Comirnaty': { boosters: [] },
    'Efluelda': { boosters: [] },
    'Encepur adultes': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '10 mois', days: 300, dose: 3 }
    ]},
    'Encepur enfants': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '10 mois', days: 300, dose: 3 }
    ]},
    'Engerix B-20': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '6 mois', days: 180, dose: 3 }
    ]},
    'FSME-Immun CC': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '6 mois', days: 180, dose: 3 }
    ]},
    'FSME-Immun Junior': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '6 mois', days: 180, dose: 3 }
    ]},
    'Havrix 1440': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '6 mois', days: 180, dose: 3 }
    ]},
    'Havrix 720': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '6 mois', days: 180, dose: 3 }
    ]},
    'IPV Polio': { boosters: [] },
    'Ixiaro': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '12 mois', days: 360, dose: 3 }
    ]},
    'Menveo': { boosters: [
        { interval: '5 ans', days: 1825, dose: 2 }
    ]},
    'Priorix': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 }
    ]},
    'Qdenga': { boosters: [
        { interval: '3 mois', days: 90, dose: 2 }
    ]},
    'Rabipur': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '12 mois', days: 360, dose: 3 }
    ]},
    'Revaxis': { boosters: [] },
    'Shingrix': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 }
    ]},
    'Stamaril': { boosters: [] },
    'Twinrix 720/20': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 },
        { interval: '6 mois', days: 180, dose: 3 }
    ]},
    'Typhim': { boosters: [
        { interval: '3 ans', days: 1095, dose: 2 }
    ]},
    'Varilrix': { boosters: [
        { interval: '1 mois', days: 30, dose: 2 }
    ]},
    'VaxigripTetra': { boosters: [] },
    'Vivotif': { boosters: [
        { interval: '1 an', days: 365, dose: 2 }
    ]}
};
