// Levels.js — правила уровней: сколько костей сломать (target), время в секундах
// (time) и подпись внизу экрана (caption — ключ Lang). Расстановка уровня — карта
// с тем же id в Maps.js (редактор, вкладки Maps / Objects).

const LEVEL_COUNT = 100;

const LEVEL_RULES = {
    'level-1': { target: 5, time: 45, caption: 'capBreak' },   // Kettlebell
    'level-2': { target: 4, time: 45, caption: 'capBreak' },   // Bowling Ball
    'level-3': { target: 5, time: 45, caption: 'capBreak' },   // Dumbbells
    'level-4': { target: 5, time: 45, caption: 'capBreak' },   // Anvil Shelf
    'level-5': { target: 5, time: 45, caption: 'capBreak' },   // Sledgehammer
    'level-6': { target: 5, time: 45, caption: 'capBreak' },   // Trash Day
    'level-7': { target: 5, time: 45, caption: 'capBreak' },   // Brick Pile
    'level-8': { target: 6, time: 45, caption: 'capBreak' },   // Punching Bag
    'level-9': { target: 6, time: 45, caption: 'capBreak' },   // Fridge
    'level-10': { target: 5, time: 45, caption: 'capCut' },   // Safe Drop
    'level-11': { target: 6, time: 45, caption: 'capBreak' },   // Drill
    'level-12': { target: 5, time: 45, caption: 'capBurn' },   // Laser
    'level-13': { target: 4, time: 45, caption: 'capBreak' },   // Baseball Bat
    'level-14': { target: 6, time: 45, caption: 'capBreak' },   // Chainsaw
    'level-15': { target: 6, time: 45, caption: 'capBreak' },   // Frying Pan
    'level-16': { target: 7, time: 45, caption: 'capBurn' },   // Flamethrower
    'level-17': { target: 7, time: 45, caption: 'capShock' },   // Taser
    'level-18': { target: 7, time: 45, caption: 'capBreak' },   // Jackhammer
    'level-19': { target: 7, time: 45, caption: 'capBreak' },   // Axe
    'level-20': { target: 7, time: 45, caption: 'capBreak' },   // Leaf Blower
    'level-21': { target: 5, time: 45, caption: 'capDrop', bot: 'drop' },   // High Dive
    'level-22': { target: 7, time: 45, caption: 'capCrush' },   // Shredder
    'level-23': { target: 7, time: 45, caption: 'capShock' },   // Lightning
    'level-24': { target: 8, time: 45, caption: 'capBreak' },   // Saw Blade
    'level-25': { target: 8, time: 45, caption: 'capBreak', bot: 'drop' },   // Spike Pit
    'level-26': { target: 8, time: 45, caption: 'capShock' },   // Electric Fence
    'level-27': { target: 8, time: 45, caption: 'capBurn', bot: 'into' },   // Campfire
    'level-28': { target: 5, time: 45, caption: 'capBreak', bot: 'drop' },   // Trampoline
    'level-29': { target: 8, time: 45, caption: 'capBreak', bot: 'drop' },   // Cactus Garden
    'level-30': { target: 8, time: 50, caption: 'capBreak', bot: 'throw' },   // Stairs
    'level-31': { target: 8, time: 50, caption: 'capCrush' },   // Road Roller
    'level-32': { target: 9, time: 50, caption: 'capBreak' },   // Car Crash
    'level-33': { target: 9, time: 45, caption: 'capCrush' },   // Hydraulic Press
    'level-34': { target: 9, time: 45, caption: 'capBreak' },   // Piston Punch
    'level-35': { target: 9, time: 50, caption: 'capBreak' },   // Train
    'level-36': { target: 9, time: 45, caption: 'capBreak' },   // Giant Fan
    'level-37': { target: 9, time: 50, caption: 'capCrush', bot: 'wait' },   // Conveyor Press
    'level-38': { target: 5, time: 50, caption: 'capBreak' },   // Garbage Truck
    'level-39': { target: 9, time: 45, caption: 'capCrush', bot: 'drop' },   // Crusher Walls
    'level-40': { target: 10, time: 50, caption: 'capBreak', bot: 'drop' },   // Blender
    'level-41': { target: 5, time: 45, caption: 'capBlast' },   // TNT
    'level-42': { target: 6, time: 45, caption: 'capBlast' },   // Bomb
    'level-43': { target: 5, time: 45, caption: 'capBlast' },   // Gas Cylinders
    'level-44': { target: 10, time: 45, caption: 'capBreak', bot: 'drop' },   // Minefield
    'level-45': { target: 5, time: 45, caption: 'capBlast' },   // Fireworks
    'level-46': { target: 7, time: 45, caption: 'capBreak' },   // Cannon
    'level-47': { target: 10, time: 45, caption: 'capBlast' },   // Explosive Barrels
    'level-48': { target: 11, time: 45, caption: 'capBlast' },   // Chain Reaction
    'level-49': { target: 11, time: 45, caption: 'capBlast' },   // Dynamite Chair
    'level-50': { target: 11, time: 50, caption: 'capBlast' },   // Big Boom
    'level-51': { target: 6, time: 45, caption: 'capBreak' },   // Wrecking Ball
    'level-52': { target: 4, time: 45, caption: 'capBreak' },   // Spiked Mace
    'level-53': { target: 5, time: 45, caption: 'capBreak' },   // Battering Ram
    'level-54': { target: 8, time: 45, caption: 'capBreak' },   // Axe Pendulums
    'level-55': { target: 6, time: 45, caption: 'capBreak' },   // Spinner
    'level-56': { target: 10, time: 45, caption: 'capBreak' },   // Windmill
    'level-57': { target: 4, time: 45, caption: 'capBreak', bot: 'throw' },   // Pinball
    'level-58': { target: 3, time: 45, caption: 'capBreak', bot: 'slamHint' },   // Seesaw
    'level-59': { target: 6, time: 45, caption: 'capBreak' },   // Anvil Swing
    'level-60': { target: 8, time: 45, caption: 'capBreak' },   // Saw Pendulums
    'level-61': { target: 12, time: 45, caption: 'capBreak' },   // Meteor Shower
    'level-62': { target: 12, time: 45, caption: 'capBreak' },   // Boulder Hill
    'level-63': { target: 12, time: 45, caption: 'capBurn' },   // Lava Pit
    'level-64': { target: 8, time: 45, caption: 'capBreak', bot: 'into' },   // Hailstorm
    'level-65': { target: 13, time: 45, caption: 'capBreak' },   // Tornado
    'level-66': { target: 13, time: 45, caption: 'capBreak' },   // Giant Snowball
    'level-67': { target: 5, time: 45, caption: 'capCut' },   // Coconut Beach
    'level-68': { target: 5, time: 45, caption: 'capCut' },   // Icicles
    'level-69': { target: 7, time: 45, caption: 'capBreak', bot: 'into' },   // Rockslide
    'level-70': { target: 13, time: 50, caption: 'capShock' },   // Thunder Dome
    'level-71': { target: 7, time: 45, caption: 'capCut' },   // Piano Drop
    'level-72': { target: 14, time: 45, caption: 'capBreak' },   // Washing Machine
    'level-73': { target: 14, time: 45, caption: 'capBreak' },   // Toilet
    'level-74': { target: 14, time: 45, caption: 'capBreak' },   // Bookcase
    'level-75': { target: 14, time: 45, caption: 'capBreak' },   // Kitchen Chaos
    'level-76': { target: 14, time: 45, caption: 'capBreak' },   // Vending Machine
    'level-77': { target: 14, time: 45, caption: 'capBreak' },   // Office Chair
    'level-78': { target: 14, time: 45, caption: 'capBreak' },   // Bathtub
    'level-79': { target: 14, time: 45, caption: 'capBreak' },   // Sofa
    'level-80': { target: 15, time: 45, caption: 'capBreak' },   // Garage Junk
    'level-81': { target: 15, time: 45, caption: 'capBurn' },   // Laser Grid
    'level-82': { target: 13, time: 45, caption: 'capBreak' },   // Robot Hammer
    'level-83': { target: 6, time: 45, caption: 'capShock' },   // Tesla Coil
    'level-84': { target: 10, time: 50, caption: 'capBreak' },   // Low Gravity
    'level-85': { target: 15, time: 45, caption: 'capBurn' },   // Acid Vat
    'level-86': { target: 15, time: 50, caption: 'capBreak', bot: 'drop' },   // Elevator Drop
    'level-87': { target: 15, time: 50, caption: 'capCrush', bot: 'wait' },   // Meat Grinder
    'level-88': { target: 15, time: 45, caption: 'capCrush' },   // Spike Ceiling
    'level-89': { target: 15, time: 50, caption: 'capCrush' },   // Double Press
    'level-90': { target: 12, time: 50, caption: 'capBreak', bot: 'wait' },   // Sawmill
    'level-91': { target: 8, time: 55, caption: 'capBreak', bot: 'throw' },   // Obstacle Course
    'level-92': { target: 15, time: 55, caption: 'capBreak' },   // Construction Site
    'level-93': { target: 15, time: 55, caption: 'capBreak' },   // Rush Hour
    'level-94': { target: 15, time: 55, caption: 'capBreak', bot: 'wait' },   // Factory Line
    'level-95': { target: 15, time: 55, caption: 'capShock' },   // Storm Tower
    'level-96': { target: 15, time: 55, caption: 'capBreak' },   // Armory
    'level-97': { target: 15, time: 55, caption: 'capBreak', bot: 'throw' },   // Doom Stairs
    'level-98': { target: 6, time: 55, caption: 'capBreak' },   // Circus
    'level-99': { target: 15, time: 55, caption: 'capBreak' },   // Everything Falls
    'level-100': { target: 14, time: 60, caption: 'capCrush', bot: 'into' },   // Final Boss
};

function levelRules(id) {
    const r = LEVEL_RULES[id] || {};
    return { id, target: r.target || 5, time: r.time || 40, caption: r.caption || 'capBreak', bot: r.bot || null };
}
