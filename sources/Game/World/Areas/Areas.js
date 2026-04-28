import { Game } from '../../Game.js'
import { AltarArea } from './AltarArea.js'
import { DishAntennaArea } from './DishAntennaArea.js'
import { LandingArea } from './LandingArea.js'
import { ReactorArea } from './ReactorArea.js'
import { LabArea } from './LabArea.js'
import { CareerArea } from './CareerArea.js'
// import { SocialArea } from './SocialArea.js' // Disabled for Mars theme
import { ToiletArea } from './ToiletArea.js'
// import { BowlingArea } from './BowlingArea.js' // Disabled for Mars theme
import { CircuitArea } from './CircuitArea.js'
import { BehindTheSceneArea } from './BehindTheSceneArea.js'
import { AchievementsArea } from './AchievementsArea.js'
import { TimeMachineArea } from './TimeMachineArea.js'
import { EasterArea } from './EasterArea.js'

export class Areas
{
    constructor()
    {
        this.game = Game.getInstance()

        const list = [
            [ 'achievements', AchievementsArea ],
            [ 'altar', AltarArea ],
            [ 'behindTheScene', BehindTheSceneArea ],
            // [ 'bowling', BowlingArea ], // Disabled for Mars theme
            [ 'career', CareerArea ],
            [ 'circuit', CircuitArea ],
            [ 'cookie', DishAntennaArea ],
            [ 'lab', LabArea ],
            [ 'landing', LandingArea ],
            [ 'projects', ReactorArea ],
            // [ 'social', SocialArea ], // Disabled for Mars theme
            [ 'toilet', ToiletArea ],
            [ 'timeMachine', TimeMachineArea ],
        ]

        const model = [...this.game.resources.areasModel.scene.children]
        
        for(const child of model)
        {
            for(const [ name, AreaClass ] of list)
            {
                if(child.name.startsWith(name))
                    this[name] = new AreaClass(child)
            }
        }

        // // Test how many areas are visible
        // this.game.ticker.events.on('tick', () =>
        // {
        //     let i = 0
        //     if(this.achievements.frustum.isIn)
        //         i++
        //     if(this.altar.frustum.isIn)
        //         i++
        //     if(this.behindTheScene.frustum.isIn)
        //         i++
        //     if(this.bowling.frustum.isIn)
        //         i++
        //     if(this.career.frustum.isIn)
        //         i++
        //     if(this.circuit.frustum.isIn)
        //         i++
        //     if(this.cookie.frustum.isIn)
        //         i++
        //     if(this.lab.frustum.isIn)
        //         i++
        //     if(this.landing.frustum.isIn)
        //         i++
        //     if(this.projects.frustum.isIn)
        //         i++
        //     if(this.social.frustum.isIn)
        //         i++
        //     if(this.toilet.frustum.isIn)
        //         i++

        //     console.log(i)
        // }, 6)
    }
}