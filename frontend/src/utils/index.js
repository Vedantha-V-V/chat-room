import { surpriseMePrompts } from '../constants'

export function getRandomPrompt(prompt){
    const index = Math.floor(Math.random()*surpriseMePrompts.length)
    const randomPrompt = surpriseMePrompts[index]

    if(randomPrompt == prompt){
        return getRandomPrompt(prompt)
    }

    return randomPrompt
}