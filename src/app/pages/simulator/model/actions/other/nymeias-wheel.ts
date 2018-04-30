import {CraftingAction} from '../crafting-action';
import {Simulation} from '../../../simulation/simulation';
import {ActionType} from '../action-type';
import {Tables} from '../../tables';
import {Buff} from '../../buff.enum';

export class NymeiasWheel extends CraftingAction {

    canBeUsed(simulationState: Simulation, linear?: boolean): boolean {
        return simulationState.crafterStats.specialist && simulationState.hasBuff(Buff.WHISTLE_WHILE_YOU_WORK);
    }

    execute(simulation: Simulation): void {
        simulation.repair(Tables.NYMEIAS_WHEEL_TABLE[simulation.getBuff(Buff.WHISTLE_WHILE_YOU_WORK).stacks])
    }

    getBaseCPCost(simulationState: Simulation): number {
        return 18;
    }

    getDurabilityCost(simulationState: Simulation): number {
        return 0;
    }

    getIds(): number[] {
        return [100153, 100154, 100153, 100156, 100157, 100158, 100159, 100160];
    }

    getSuccessRate(simulationState: Simulation): number {
        return 0;
    }

    getType(): ActionType {
        return ActionType.REPAIR;
    }
}
