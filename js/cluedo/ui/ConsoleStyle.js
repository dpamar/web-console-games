/**
 * Console styles for Cluedo - uses the shared ConsoleStyleFactory.
 */
import { ConsoleStyleFactory } from '../../ui/ConsoleStyleFactory.js';

// Create Cluedo-specific styles using the factory
export const ConsoleStyle = ConsoleStyleFactory.createStyles({
    // Game-specific styles for Cluedo
    GRID_SELECTOR: 'grid-selector',
    DEFAULT_CARD_COLOR: 'card-default',
    ASSIGNED_CARD_COLOR: 'card-assigned',
    SOLUTION_CARD_COLOR: 'card-solution'
});
