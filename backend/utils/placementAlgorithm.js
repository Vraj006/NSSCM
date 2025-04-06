const Item = require('../models/Item');
const Container = require('../models/Container');

/**
 * Find optimal placement for items in containers
 * @param {Array} items - Array of items to place
 * @param {Array} containers - Array of available containers
 * @returns {Object} Placement and rearrangement instructions
 */
async function findOptimalPlacement(items, containers) {
    try {
        // Sort items by priority (highest first)
        const sortedItems = items.sort((a, b) => b.priority - a.priority);
        
        const placements = [];
        const unplacedItems = [];
        const rearrangements = [];

        // Group containers by zone
        const containersByZone = containers.reduce((acc, container) => {
            if (!acc[container.zone]) {
                acc[container.zone] = [];
            }
            acc[container.zone].push(container);
            return acc;
        }, {});

        for (const item of sortedItems) {
            let placed = false;

            // First try preferred zone
            if (containersByZone[item.preferredZone]) {
                placed = await tryPlacementInZone(
                    item,
                    containersByZone[item.preferredZone],
                    placements,
                    rearrangements
                );
            }

            // If not placed, try other zones
            if (!placed) {
                for (const zone in containersByZone) {
                    if (zone !== item.preferredZone) {
                        placed = await tryPlacementInZone(
                            item,
                            containersByZone[zone],
                            placements,
                            rearrangements
                        );
                        if (placed) break;
                    }
                }
            }

            // If still not placed, add to unplaced items
            if (!placed) {
                unplacedItems.push(item);
            }
        }

        return {
            success: true,
            placements,
            unplacedItems,
            rearrangements
        };

    } catch (error) {
        console.error('Placement algorithm error:', error);
        return {
            success: false,
            message: 'Error in placement algorithm',
            error: error.message
        };
    }
}

async function tryPlacementInZone(item, containers, placements, rearrangements) {
    // Sort containers by available space (most space first)
    const sortedContainers = containers.sort((a, b) => {
        const aSpace = getAvailableSpace(a, placements);
        const bSpace = getAvailableSpace(b, placements);
        return bSpace - aSpace;
    });

    for (const container of sortedContainers) {
        const position = findPosition(item, container, placements);
        
        if (position) {
            // Check if rearrangement is needed
            const rearrangementNeeded = checkRearrangement(item, container, position, placements);
            
            if (rearrangementNeeded.length > 0) {
                rearrangements.push(...rearrangementNeeded);
            }

            placements.push({
                itemId: item.itemId,
                containerId: container.containerId,
                position: position
            });

            return true;
        }
    }

    return false;
}

function getAvailableSpace(container, placements) {
    const containerVolume = container.dimensions.width * 
                          container.dimensions.depth * 
                          container.dimensions.height;
    
    const usedVolume = placements
        .filter(p => p.containerId === container.containerId)
        .reduce((total, placement) => {
            const volume = placement.position.endCoordinates.width *
                         placement.position.endCoordinates.depth *
                         placement.position.endCoordinates.height;
            return total + volume;
        }, 0);

    return containerVolume - usedVolume;
}

function findPosition(item, container, placements) {
    // Get existing items in this container
    const containerItems = placements.filter(p => p.containerId === container.containerId);

    // Check basic fit
    if (!doesItemFit(item, container)) {
        return null;
    }

    // Find optimal position using 3D bin packing
    const position = find3DPosition(item, container, containerItems);
    
    return position;
}

function doesItemFit(item, container) {
    return (
        item.dimensions.width <= container.dimensions.width &&
        item.dimensions.depth <= container.dimensions.depth &&
        item.dimensions.height <= container.dimensions.height
    );
}

function find3DPosition(item, container, existingItems) {
    // Implementation of 3D bin packing algorithm
    // This is a simplified version - you might want to implement a more sophisticated algorithm
    
    const positions = [{ x: 0, y: 0, z: 0 }];
    
    for (const pos of positions) {
        if (isPositionValid(item, pos, container, existingItems)) {
            return {
                startCoordinates: {
                    width: pos.x,
                    depth: pos.y,
                    height: pos.z
                },
                endCoordinates: {
                    width: pos.x + item.dimensions.width,
                    depth: pos.y + item.dimensions.depth,
                    height: pos.z + item.dimensions.height
                }
            };
        }
    }

    return null;
}

function isPositionValid(item, position, container, existingItems) {
    // Check container boundaries
    if (
        position.x + item.dimensions.width > container.dimensions.width ||
        position.y + item.dimensions.depth > container.dimensions.depth ||
        position.z + item.dimensions.height > container.dimensions.height
    ) {
        return false;
    }

    // Check collision with existing items
    for (const existing of existingItems) {
        if (checkCollision(
            position,
            item.dimensions,
            existing.position.startCoordinates,
            {
                width: existing.position.endCoordinates.width - existing.position.startCoordinates.width,
                depth: existing.position.endCoordinates.depth - existing.position.startCoordinates.depth,
                height: existing.position.endCoordinates.height - existing.position.startCoordinates.height
            }
        )) {
            return false;
        }
    }

    return true;
}

function checkCollision(pos1, size1, pos2, size2) {
    return !(
        pos1.x + size1.width <= pos2.width ||
        pos1.x >= pos2.width + size2.width ||
        pos1.y + size1.depth <= pos2.depth ||
        pos1.y >= pos2.depth + size2.depth ||
        pos1.z + size1.height <= pos2.height ||
        pos1.z >= pos2.height + size2.height
    );
}

function checkRearrangement(item, container, position, placements) {
    const rearrangements = [];
    
    // Get all existing items in this container
    const existingItems = placements.filter(p => p.containerId === container.containerId);
    
    // Find items that need to be moved (low priority items that are in the way)
    for (const existing of existingItems) {
        // Check if we have collision with our desired position
        if (checkCollision(
            position.startCoordinates,
            {
                width: position.endCoordinates.width - position.startCoordinates.width,
                depth: position.endCoordinates.depth - position.startCoordinates.depth,
                height: position.endCoordinates.height - position.startCoordinates.height
            },
            existing.position.startCoordinates,
            {
                width: existing.position.endCoordinates.width - existing.position.startCoordinates.width,
                depth: existing.position.endCoordinates.depth - existing.position.startCoordinates.depth,
                height: existing.position.endCoordinates.height - existing.position.startCoordinates.height
            }
        )) {
            // Look up the original item to get its priority
            const existingItem = item.find(i => i.itemId === existing.itemId);
            
            // If the existing item has lower priority, add it to rearrangements
            if (existingItem && existingItem.priority < item.priority) {
                rearrangements.push({
                    step: rearrangements.length + 1,
                    action: "move",
                    itemId: existing.itemId,
                    fromContainer: container.containerId,
                    fromPosition: existing.position,
                    // For now, just mark it for removal; we'll need to find a new position later
                    toContainer: "TEMPORARY_STORAGE",
                    toPosition: null
                });
            }
        }
    }
    
    // Add the placement of our item as the final rearrangement step
    if (rearrangements.length > 0) {
        rearrangements.push({
            step: rearrangements.length + 1,
            action: "place",
            itemId: item.itemId,
            fromContainer: "TEMPORARY_STORAGE",
            fromPosition: null,
            toContainer: container.containerId,
            toPosition: position
        });
    }
    
    return rearrangements;
}

module.exports = {
    findOptimalPlacement
};