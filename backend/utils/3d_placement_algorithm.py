import numpy as np
from typing import List, Dict, Tuple, Optional
import json
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import os
import sys
import argparse

# Try to import plotly, if available
try:
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False
    print("Plotly not available. Using matplotlib for visualization.", file=sys.stderr)

class Item:
    """Represents a 3D item with dimensions and attributes"""
    def __init__(self, item_id: str, name: str, width: float, depth: float, height: float, 
                 mass: float, priority: int, expiry_date: str, zone: str = None):
        self.item_id = item_id
        self.name = name
        # Ensure dimensions are at least 1 to avoid 0 values
        self.width = max(float(width), 1.0)
        self.depth = max(float(depth), 1.0)
        self.height = max(float(height), 1.0)
        self.volume = self.width * self.depth * self.height
        self.mass = max(float(mass), 0.1)
        self.priority = priority
        self.expiry_date = expiry_date
        self.preferred_zone = zone
        self.position = None  # Will store (x, y, z) coordinates when placed
        
    def __repr__(self):
        return f"Item({self.item_id}, {self.width}x{self.depth}x{self.height}, p:{self.priority}, zone:{self.preferred_zone})"

class Container:
    """Represents a 3D container with dimensions and a space matrix"""
    def __init__(self, container_id: str, width: float, depth: float, height: float, zone: str):
        self.container_id = container_id
        # Ensure dimensions are at least 1 to avoid 0 values
        self.width = max(float(width), 1.0)
        self.depth = max(float(depth), 1.0)
        self.height = max(float(height), 1.0)
        self.volume = self.width * self.depth * self.height
        self.zone = zone
        self.available_volume = self.volume
        self.items = []
        
        # Create a 3D matrix to represent the container space
        # Resolution determines the granularity of our spatial representation
        self.resolution = 10  # Each unit is divided into 10 cells
        self.space = np.zeros((
            int(self.width * self.resolution),
            int(self.depth * self.resolution),
            int(self.height * self.resolution)
        ), dtype=bool)
        
    def is_position_valid(self, item: Item, position: Tuple[int, int, int]) -> bool:
        """Check if an item can be placed at the given position"""
        x, y, z = position
        if (x < 0 or y < 0 or z < 0 or
            x + item.width * self.resolution > self.width * self.resolution or
            y + item.depth * self.resolution > self.depth * self.resolution or
            z + item.height * self.resolution > self.height * self.resolution):
            return False
            
        # Check if the space is already occupied
        item_width = int(item.width * self.resolution)
        item_depth = int(item.depth * self.resolution)
        item_height = int(item.height * self.resolution)
        
        return not np.any(self.space[x:x+item_width, y:y+item_depth, z:z+item_height])
    
    def place_item(self, item: Item, position: Tuple[int, int, int]) -> bool:
        """Place an item at the given position if valid"""
        if not self.is_position_valid(item, position):
            return False
            
        x, y, z = position
        item_width = int(item.width * self.resolution)
        item_depth = int(item.depth * self.resolution)
        item_height = int(item.height * self.resolution)
        
        # Mark the space as occupied
        self.space[x:x+item_width, y:y+item_depth, z:z+item_height] = True
        
        # Store the position in the item
        item.position = (x / self.resolution, y / self.resolution, z / self.resolution)
        
        # Add the item to the container's item list
        self.items.append(item)
        
        # Update available volume
        self.available_volume -= item.volume
        
        return True
    
    def __repr__(self):
        return f"Container({self.container_id}, {self.width}x{self.depth}x{self.height}, zone:{self.zone}, items:{len(self.items)})"


class ThreeDimensionalPacking:
    """3D packing algorithm with various placement strategies"""
    
    def __init__(self, containers: List[Container], items: List[Item], debug=False, enforce_zones=False):
        self.containers = containers
        self.items = sorted(items, key=lambda x: (-x.priority, x.expiry_date))  # Sort by priority (desc) and expiry date
        self.placements = {}  # Will store successful placements
        self.debug = debug
        self.enforce_zones = enforce_zones
        
    def find_bottom_left_back_position(self, container: Container, item: Item) -> Optional[Tuple[int, int, int]]:
        """Find the bottom-left-back position for an item (gravity-based placement with improved priority)"""
        width_cells = int(container.width * container.resolution)
        depth_cells = int(container.depth * container.resolution)
        height_cells = int(container.height * container.resolution)
        item_width = int(item.width * container.resolution)
        item_depth = int(item.depth * container.resolution)
        item_height = int(item.height * container.resolution)
        
        # First try to place the item on the floor if possible
        floor_positions = []
        
        # High priority items should be placed at the front of the container for easy access
        # Sort y positions based on item priority (lower y values = front of container)
        y_range = range(depth_cells - item_depth + 1)
        if item.priority > 5:  # Higher priority items first
            y_range = sorted(y_range)  # Front of container first
        else:
            y_range = sorted(y_range, reverse=True)  # Back of container first
            
        # Try all positions on the floor first
        for x in range(width_cells - item_width + 1):
            for y in y_range:
                z = 0  # Floor level
                if container.is_position_valid(item, (x, y, z)):
                    # Found a valid floor position
                    print(f"Found floor position for {item.item_id} at ({x}, {y}, {z})")
                    return (x, y, z)
        
        print(f"No floor positions available for {item.item_id}, trying stacking...")
        
        # If no floor positions are available, try stacking on other items
        for x in range(width_cells - item_width + 1):
            for y in y_range:
                # Start from 1 (above floor) and find first valid position with support
                for z in range(1, height_cells - item_height + 1):
                    # Check if we can place the item here
                    if container.is_position_valid(item, (x, y, z)):
                        # Check if there's support below
                        has_support = False
                        # Calculate support percentage required (at least 50% support)
                        required_support = (item_width * item_depth) * 0.5  
                        
                        # Count supported cells
                        support_count = 0
                        for sx in range(x, x + item_width):
                            for sy in range(y, y + item_depth):
                                if sx < width_cells and sy < depth_cells and z > 0 and container.space[sx, sy, z-1]:
                                    support_count += 1
                        
                        if support_count >= required_support:
                            has_support = True
                            
                        if has_support:
                            print(f"Found supported position for {item.item_id} at ({x}, {y}, {z})")
                            return (x, y, z)
        
        print(f"No valid position found for {item.item_id}")
        return None  # No valid position found
    
    def pack_items(self) -> Dict:
        """Pack items into containers using the 3D packing algorithm"""
        results = {
            "successful_placements": [],
            "unplaced_items": []
        }
        
        if self.debug:
            print(f"\nPACKING ALGORITHM: Starting with {len(self.items)} items to place")
            print(f"Items sorted by priority: {[(item.item_id, item.priority) for item in self.items]}")
        
        # First, try to place items in their preferred zones
        for item_index, item in enumerate(self.items):
            placed = False
            
            if self.debug:
                print(f"\nProcessing item {item_index+1}/{len(self.items)}: {item.item_id}")
                print(f"  Priority: {item.priority}, Preferred zone: {item.preferred_zone}")
                print(f"  Dimensions: {item.width}x{item.depth}x{item.height}, Volume: {item.volume}")
            
            # Check if the item already has a position (for visualization with existing placements)
            if hasattr(item, 'position') and item.position:
                if self.debug:
                    print(f"  Item already has position: {item.position}")
                
                # Find the container by checking dimensions
                for container in self.containers:
                    if (item.position[0] >= 0 and item.position[0] + item.width <= container.width and
                        item.position[1] >= 0 and item.position[1] + item.depth <= container.depth and
                        item.position[2] >= 0 and item.position[2] + item.height <= container.height):
                        # Add the item to the container for visualization
                        container.items.append(item)
                        placed = True
                        
                        results["successful_placements"].append({
                            "item_id": item.item_id,
                            "container_id": container.container_id,
                            "position": {
                                "x": item.position[0],
                                "y": item.position[1],
                                "z": item.position[2]
                            },
                            "dimensions": {
                                "width": item.width,
                                "depth": item.depth,
                                "height": item.height
                            }
                        })
                        break
                
                if placed:
                    continue
                    
            # First try containers with matching zone if enforce_zones is True
            # or try all containers if enforce_zones is False
            matching_containers = []
            
            if self.enforce_zones:
                # Only use containers that match the preferred zone
                matching_containers = [container for container in self.containers 
                                      if container.zone == item.preferred_zone]
                
                if not matching_containers:
                    if self.debug:
                        print(f"  No containers found with matching zone {item.preferred_zone} for item {item.item_id}")
                    results["unplaced_items"].append({
                        "item_id": item.item_id,
                        "reason": f"No containers available with matching zone {item.preferred_zone}"
                    })
                    continue
            else:
                # Try preferred zone first, but allow other zones if needed
                matching_containers = sorted(self.containers, 
                                           key=lambda c: 0 if c.zone == item.preferred_zone else 1)
        
            # Try to place the item in each matching container
            for container in matching_containers:
                if self.debug:
                    print(f"  Trying container {container.container_id}, zone: {container.zone}")
                    print(f"  Container dimensions: {container.width}x{container.depth}x{container.height}")
                    print(f"  Current container utilization: {container.items}")
                
                # Check if placement in this container is allowed based on zone
                if self.enforce_zones and container.zone != item.preferred_zone:
                    if self.debug:
                        print(f"  Skipping container {container.container_id} with zone {container.zone} "
                              f"because it doesn't match item's preferred zone {item.preferred_zone}")
                    continue
                    
                # Check if item can physically fit in the container
                if (item.width > container.width or
                    item.depth > container.depth or
                    item.height > container.height):
                    if self.debug:
                        print(f"  Item too large for container {container.container_id}")
                    continue
                
                position = self.find_bottom_left_back_position(container, item)
                if position is not None:
                    # We found a valid position, place the item
                    if container.place_item(item, position):
                        if self.debug:
                            print(f"  Item {item.item_id} placed in container {container.container_id} "
                                  f"at position ({position[0]/container.resolution}, "
                                  f"{position[1]/container.resolution}, {position[2]/container.resolution})")
                        
                        placed = True
                        results["successful_placements"].append({
                            "item_id": item.item_id,
                            "container_id": container.container_id,
                            "position": {
                                "x": position[0]/container.resolution,
                                "y": position[1]/container.resolution,
                                "z": position[2]/container.resolution
                            },
                            "dimensions": {
                                "width": item.width,
                                "depth": item.depth,
                                "height": item.height
                            }
                        })
                        break
            
            if not placed:
                if self.debug:
                    print(f"  Could not place item {item.item_id}")
                    
                # Check why the item couldn't be placed
                reason = "No suitable position found"
                if self.enforce_zones and not matching_containers:
                    reason = f"No containers available with matching zone {item.preferred_zone}"
                
                results["unplaced_items"].append({
                    "item_id": item.item_id,
                    "reason": reason
                })
        
        # Calculate container statistics
        results["container_stats"] = []
        for container in self.containers:
            utilization_percentage = (1 - (container.available_volume / container.volume)) * 100
            results["container_stats"].append({
                "container_id": container.container_id,
                "zone": container.zone,
                "items_placed": len(container.items),
                "volume_utilization": utilization_percentage,
                "available_volume": container.available_volume,
                "total_volume": container.volume
            })
        
        return results
    
    def visualize(self, output_path: str = None):
        """Visualize the 3D placements of items in containers"""
        print(f"Visualizing 3D placements to: {output_path}")
        
        try:
            # Try to use Plotly for advanced interactive 3D visualization first
            if PLOTLY_AVAILABLE:
                if not output_path:
                    print("No output path provided for visualization.")
                    return
                
                # Create a directory for visualizations if not exists
                if not os.path.exists(output_path):
                    os.makedirs(output_path)
                
                # Get items with positions
                items_with_positions = []
                for container in self.containers:
                    container_items = container.items
                    if container_items:
                        # Visualize each container with its items
                        container_output_path = os.path.join(output_path, f"container_{container.container_id}_3d.html")
                        visualize_container_plotly(container, container_items, container_output_path)
                        print(f"Container visualization saved to: {container_output_path}")
                        
                        items_with_positions.extend(container_items)
                
                # Also create a visualization of all containers and items together
                all_containers_path = os.path.join(output_path, "all_containers_3d.html")
                self.visualize_all_containers_plotly(all_containers_path)
                print(f"All containers visualization saved to: {all_containers_path}")
                
                return True
            else:
                # Fallback to matplotlib for simpler visualization if Plotly is not available
                for container in self.containers:
                    if container.items:
                        container_output_path = os.path.join(output_path, f"container_{container.container_id}_3d.png")
                        visualize_container(container, container_output_path)
                return True
                
        except Exception as e:
            print(f"Error in visualization: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return False
    
    def visualize_all_containers_plotly(self, output_path: str):
        """Create a visualization of all containers and their items"""
        try:
            import plotly.graph_objects as go
            from plotly.subplots import make_subplots
            
            fig = go.Figure()
            
            # Add each container with appropriate offset
            x_offset = 0
            for container in self.containers:
                width = container.width
                depth = container.depth 
                height = container.height
                container_id = container.container_id
                
                # Define container coordinates with offset
                x = [x_offset, x_offset + width, x_offset + width, x_offset, x_offset, x_offset + width, x_offset + width, x_offset]
                y = [0, 0, depth, depth, 0, 0, depth, depth]
                z = [0, 0, 0, 0, height, height, height, height]
                
                # Add container wireframe
                edges = [
                    # Bottom face
                    [0, 1], [1, 2], [2, 3], [3, 0],
                    # Top face 
                    [4, 5], [5, 6], [6, 7], [7, 4],
                    # Connecting edges
                    [0, 4], [1, 5], [2, 6], [3, 7]
                ]
                
                for edge in edges:
                    fig.add_trace(go.Scatter3d(
                        x=[x[edge[0]], x[edge[1]]],
                        y=[y[edge[0]], y[edge[1]]],
                        z=[z[edge[0]], z[edge[1]]],
                        mode='lines',
                        line=dict(color='rgba(30, 30, 30, 0.8)', width=2),
                        hoverinfo='none',
                        showlegend=False
                    ))
                
                # Add container faces with transparency
                # Bottom face
                fig.add_trace(go.Mesh3d(
                    x=[x_offset, x_offset + width, x_offset + width, x_offset],
                    y=[0, 0, depth, depth],
                    z=[0, 0, 0, 0],
                    i=[0, 0],
                    j=[1, 2],
                    k=[2, 3],
                    color='rgba(180, 180, 180, 0.3)',
                    name=f"Container {container_id} Floor",
                    showlegend=False
                ))
                
                # Add items in this container
                for item in container.items:
                    # Get item details
                    item_width = item.width
                    item_depth = item.depth
                    item_height = item.height
                    item_x, item_y, item_z = item.position
                    
                    # Adjust x position with container offset
                    item_x += x_offset
                    
                    # Get color based on priority
                    priority = item.priority if hasattr(item, 'priority') else 5
                    color = ThreeDimensionalPacking.get_color_for_priority(priority)
                    
                    # Create 3D box for the item
                    x0, y0, z0 = item_x, item_y, item_z
                    x1, y1, z1 = x0 + item_width, y0 + item_depth, z0 + item_height
                    
                    item_vertices = [
                        [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],  # Bottom face
                        [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]   # Top face
                    ]
                    
                    i = [0, 0, 0, 0, 4, 4, 0, 0, 0, 0]  # First vertex of triangle
                    j = [1, 2, 4, 7, 5, 6, 1, 2, 3, 7]  # Second vertex of triangle
                    k = [2, 3, 5, 3, 6, 7, 5, 6, 7, 4]  # Third vertex of triangle
                    
                    fig.add_trace(go.Mesh3d(
                        x=[v[0] for v in item_vertices],
                        y=[v[1] for v in item_vertices],
                        z=[v[2] for v in item_vertices],
                        i=i, j=j, k=k,
                        opacity=0.8,
                        color=color,
                        name=item.name,
                        hoverinfo="text",
                        hovertext=f"Item: {item.name}<br>Position: ({item_x-x_offset}, {item_y}, {item_z})<br>Dimensions: {item_width}×{item_depth}×{item_height}"
                    ))
                
                # Move to next container position
                x_offset += width + 50  # Add gap between containers
            
            # Set layout with improved camera position
            fig.update_layout(
                scene=dict(
                    aspectmode='data',
                    camera=dict(
                        eye=dict(x=1.5, y=1.5, z=1.0),
                        up=dict(x=0, y=0, z=1)
                    ),
                    xaxis_title='Width',
                    yaxis_title='Depth',
                    zaxis_title='Height'
                ),
                margin=dict(l=0, r=0, b=0, t=30),
                scene_dragmode='orbit',
                title="All Containers 3D View"
            )
            
            # Write to HTML file
            fig.write_html(output_path)
            return True
            
        except Exception as e:
            print(f"Error creating all containers visualization: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return False
    
    @staticmethod
    def get_color_for_priority(priority):
        """Get a color based on item priority"""
        p = int(priority) if priority is not None else 5
        p = max(1, min(10, p))
        
        if p >= 8:  # High priority (8-10): red spectrum
            return f'rgb(220, {60 + (10-p)*15}, {40 + (10-p)*10})'
        elif p >= 4:  # Medium priority (4-7): orange/yellow spectrum
            return f'rgb(220, {150 + (7-p)*15}, 30)'
        else:  # Low priority (1-3): blue spectrum
            return f'rgb({40 + p*20}, {100 + p*20}, 220)'
    
    @staticmethod
    def run_packing_simulation(containers_data, items_data, output_path=None, debug=True):
        """Run a packing simulation with the provided container and item data"""
        # Enable more detailed logging if in debug mode
        if debug:
            print("\n==== 3D PACKING ALGORITHM DEBUG MODE ====")
            print(f"Running simulation with {len(containers_data)} containers and {len(items_data)} items")
            
        # Create Container objects
        containers = []
        for c in containers_data:
            try:
                container_id = c.get("containerId", "unknown")
                width = float(c.get("dimensions", {}).get("width", 100))
                depth = float(c.get("dimensions", {}).get("depth", 100))
                height = float(c.get("dimensions", {}).get("height", 100))
                zone = c.get("zone", "A")
                
                if debug:
                    print(f"Creating container: {container_id} ({width}x{depth}x{height}) in zone {zone}")
                
                container = Container(
                    container_id=container_id,
                    width=width,
                    depth=depth,
                    height=height,
                    zone=zone
                )
                containers.append(container)
            except Exception as e:
                print(f"Error creating container: {e}")
                print(f"Container data: {c}")
        
        # Create Item objects
        items = []
        for i in items_data:
            try:
                item_id = i.get("itemId", f"item-{len(items)}")
                name = i.get("name", f"Item {len(items)}")
                width = float(i.get("dimensions", {}).get("width", 50))
                depth = float(i.get("dimensions", {}).get("depth", 50))
                height = float(i.get("dimensions", {}).get("height", 50))
                mass = float(i.get("mass", 1))
                priority = int(i.get("priority", 5))
                expiry_date = i.get("expiryDate", "")
                zone = i.get("preferredZone", "A")
                
                # Handle position if provided (for visualization)
                position = i.get("position")
                
                if debug:
                    print(f"Creating item: {item_id} ({width}x{depth}x{height}) priority {priority}")
                    if position:
                        print(f"  Position: ({position.get('x')}, {position.get('y')}, {position.get('z')})")
                
                item = Item(
                    item_id=item_id,
                    name=name,
                    width=width,
                    depth=depth,
                    height=height,
                    mass=mass,
                    priority=priority,
                    expiry_date=expiry_date,
                    zone=zone
                )
                
                # If position is provided, store it (useful for visualization)
                if position:
                    x = float(position.get("x", 0))
                    y = float(position.get("y", 0))
                    z = float(position.get("z", 0))
                    item.position = (x, y, z)
                
                items.append(item)
            except Exception as e:
                print(f"Error creating item: {e}")
                print(f"Item data: {i}")
        
        if debug:
            print(f"Created {len(containers)} containers and {len(items)} items")
            print("Starting packing algorithm...")
        
        # Run the packing algorithm
        packer = ThreeDimensionalPacking(containers, items, debug=debug)
        results = packer.pack_items()
        
        # Visualize the results if requested
        if output_path:
            if debug:
                print(f"Generating visualizations in {output_path}")
            packer.visualize(output_path)
        
        if debug:
            print("Packing algorithm completed")
            print(f"Successfully placed: {len(results.get('successful_placements', []))} items")
            print(f"Unplaced items: {len(results.get('unplaced_items', []))}")
            print("==== END DEBUG MODE ====\n")
            
        return results

def visualize_item_plotly(item: Dict, output_path: str) -> bool:
    """Create an interactive 3D visualization of a single item using Plotly"""
    if not PLOTLY_AVAILABLE:
        print("Plotly not available. Cannot create interactive visualization.", file=sys.stderr)
        return False
        
    try:
        # Extract item dimensions
        width = item.get('dimensions', {}).get('width', 100)
        depth = item.get('dimensions', {}).get('depth', 100)
        height = item.get('dimensions', {}).get('height', 100)
        name = item.get('name', 'Unknown Item')
        item_id = item.get('itemId', 'unknown')
        
        # Create a 3D figure
        fig = make_subplots(rows=1, cols=1, specs=[[{'type': 'scene'}]])
        
        # Add item as a mesh cube
        x = [0, 0, width, width, 0, 0, width, width]
        y = [0, depth, depth, 0, 0, depth, depth, 0]
        z = [0, 0, 0, 0, height, height, height, height]
        
        i = [0, 0, 3, 4, 4, 0, 3, 3]
        j = [1, 2, 2, 5, 6, 4, 7, 7]
        k = [2, 3, 7, 6, 7, 5, 6, 4]
        
        # Create mesh3d object with colorful face colors
        mesh = go.Mesh3d(
            x=x, y=y, z=z, i=i, j=j, k=k,
            opacity=0.8,
            colorscale=[[0, 'rgb(0, 100, 200)'], [1, 'rgb(0, 150, 255)']],
            intensity=[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
            hoverinfo='text',
            hovertext=[f'{name} ({width}x{depth}x{height})'],
            name=name
        )
        fig.add_trace(mesh)
        
        # Add wireframe for better visibility
        edges_x = [0, width, width, 0, 0, 0, width, width, 0, 0, 0, width, width, 0, 0, width]
        edges_y = [0, 0, depth, depth, 0, 0, 0, depth, depth, 0, depth, depth, 0, 0, depth, depth]
        edges_z = [0, 0, 0, 0, 0, height, height, height, height, 0, 0, 0, 0, height, height, height]
        
        edges = go.Scatter3d(
            x=edges_x, y=edges_y, z=edges_z,
            mode='lines',
            line=dict(color='black', width=2),
            hoverinfo='none'
        )
        fig.add_trace(edges)
        
        # Add dimensions text as annotations
        dimensions_text = go.Scatter3d(
            x=[width/2], y=[depth/2], z=[height+10],
            mode='text',
            text=[f'Dimensions: {width} x {depth} x {height}'],
            textposition='top center'
        )
        fig.add_trace(dimensions_text)
        
        # Set layout properties
        fig.update_layout(
            title=f'3D Visualization: {name}',
            scene=dict(
                xaxis_title='Width',
                yaxis_title='Depth',
                zaxis_title='Height',
                aspectmode='data',
                camera=dict(
                    eye=dict(x=1.5, y=1.5, z=1.2),
                    up=dict(x=0, y=0, z=1)
                )
            ),
            margin=dict(l=0, r=0, b=0, t=50),
            showlegend=False,
            template='plotly_dark'
        )
        
        # Save as interactive HTML
        fig.write_html(
            output_path,
            include_plotlyjs='cdn',
            full_html=True,
            include_mathjax='cdn'
        )
        
        print(f"Interactive 3D visualization created at: {output_path}")
        return True
    
    except Exception as e:
        print(f"Error creating Plotly visualization: {e}", file=sys.stderr)
        return False

def visualize_container_plotly(container, items, output_path):
    """Create an interactive 3D visualization of a container and its items using Plotly"""
    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots
        import numpy as np
        
        # Extract container dimensions (directly access Container object properties)
        width = container.width if hasattr(container, 'width') else 200
        depth = container.depth if hasattr(container, 'depth') else 200
        height = container.height if hasattr(container, 'height') else 200
        container_id = container.container_id if hasattr(container, 'container_id') else 'unknown'
        
        print(f"Creating container visualization for {container_id} ({width}x{depth}x{height})")
        print(f"Number of items: {len(items)}")
        
        # Create 3D figure with a single subplot - make figure larger
        fig = make_subplots(
            rows=1, cols=1,
            specs=[[{'type': 'scene'}]],
            subplot_titles=[f'Container {container_id} ({width} × {depth} × {height})']
        )
        
        # Create a larger floor grid for better scaling and visibility
        grid_spacing = min(width, depth) / 10
        grid_x = np.arange(0, width + grid_spacing, grid_spacing)
        grid_y = np.arange(0, depth + grid_spacing, grid_spacing)
        grid_z = [0] * len(grid_x)  # Floor level
        
        # Draw grid lines on floor
        for i, x_val in enumerate(grid_x):
            fig.add_trace(go.Scatter3d(
                x=[x_val] * len(grid_y),
                y=grid_y,
                z=grid_z,
                mode='lines',
                line=dict(color='rgba(150, 150, 150, 0.4)', width=1),
                hoverinfo='none',
                showlegend=False
            ))
            
        for i, y_val in enumerate(grid_y):
            fig.add_trace(go.Scatter3d(
                x=grid_x,
                y=[y_val] * len(grid_x),
                z=grid_z,
                mode='lines',
                line=dict(color='rgba(150, 150, 150, 0.4)', width=1),
                hoverinfo='none',
                showlegend=False
            ))
        
        # Create visible container surfaces for all 6 faces
        # Define container coordinates
        x = [0, width, width, 0, 0, width, width, 0]
        y = [0, 0, depth, depth, 0, 0, depth, depth]
        z = [0, 0, 0, 0, height, height, height, height]
        
        # Bottom face (floor)
        fig.add_trace(go.Mesh3d(
            x=[0, width, width, 0],
            y=[0, 0, depth, depth],
            z=[0, 0, 0, 0],
            i=[0, 0],
            j=[1, 2],
            k=[2, 3],
            color='rgba(180, 180, 180, 0.4)',
            name="Container Floor",
            showlegend=False
        ))
        
        # Front face (y=0)
        fig.add_trace(go.Mesh3d(
            x=[0, width, width, 0],
            y=[0, 0, 0, 0],
            z=[0, 0, height, height],
            i=[0, 0],
            j=[1, 2],
            k=[2, 3],
            color='rgba(150, 180, 220, 0.2)',
            name="Container Front",
            showlegend=False
        ))
        
        # Back face (y=depth)
        fig.add_trace(go.Mesh3d(
            x=[0, width, width, 0],
            y=[depth, depth, depth, depth],
            z=[0, 0, height, height],
            i=[0, 0],
            j=[1, 2],
            k=[2, 3],
            color='rgba(150, 180, 220, 0.2)',
            name="Container Back",
            showlegend=False
        ))
        
        # Left face (x=0)
        fig.add_trace(go.Mesh3d(
            x=[0, 0, 0, 0],
            y=[0, depth, depth, 0],
            z=[0, 0, height, height],
            i=[0, 0],
            j=[1, 2],
            k=[2, 3],
            color='rgba(150, 180, 220, 0.2)',
            name="Container Left",
            showlegend=False
        ))
        
        # Right face (x=width)
        fig.add_trace(go.Mesh3d(
            x=[width, width, width, width],
            y=[0, depth, depth, 0],
            z=[0, 0, height, height],
            i=[0, 0],
            j=[1, 2],
            k=[2, 3],
            color='rgba(150, 180, 220, 0.2)',
            name="Container Right",
            showlegend=False
        ))
        
        # Top face (optional, can be commented out for better visibility)
        fig.add_trace(go.Mesh3d(
            x=[0, width, width, 0],
            y=[0, 0, depth, depth],
            z=[height, height, height, height],
            i=[0, 0],
            j=[1, 2],
            k=[2, 3],
            color='rgba(150, 180, 220, 0.1)',
            opacity=0.1,
            name="Container Top",
            showlegend=False
        ))
        
        # Add dimension markers
        # Height markers on container walls for better perception
        for h in range(0, int(height) + 1, max(1, int(height / 5))):
            fig.add_trace(go.Scatter3d(
                x=[0, width, width, 0, 0],
                y=[0, 0, depth, depth, 0],
                z=[h, h, h, h, h],
                mode='lines',
                line=dict(color='rgba(100, 100, 100, 0.6)', width=1.5),
                hoverinfo='none',
                showlegend=False
            ))
        
        # Container wireframe with thicker, more visible lines
        edges = [
            # Bottom face
            [0, 1], [1, 2], [2, 3], [3, 0],
            # Top face 
            [4, 5], [5, 6], [6, 7], [7, 4],
            # Connecting edges
            [0, 4], [1, 5], [2, 6], [3, 7]
        ]
        
        for edge in edges:
            fig.add_trace(go.Scatter3d(
                x=[x[edge[0]], x[edge[1]]],
                y=[y[edge[0]], y[edge[1]]],
                z=[z[edge[0]], z[edge[1]]],
                mode='lines',
                line=dict(color='rgba(30, 30, 30, 0.9)', width=3),
                hoverinfo='none',
                showlegend=False
            ))
        
        # Add dimension lines and labels
        # X-axis dimension line
        fig.add_trace(go.Scatter3d(
            x=[0, width],
            y=[0, 0],
            z=[-5, -5],
            mode='lines+text',
            line=dict(color='red', width=3),
            text=['', f'Width: {width}'],
            textposition='middle right',
            hoverinfo='none',
            showlegend=False
        ))
        
        # Y-axis dimension line
        fig.add_trace(go.Scatter3d(
            x=[0, 0],
            y=[0, depth],
            z=[-5, -5],
            mode='lines+text',
            line=dict(color='green', width=3),
            text=['', f'Depth: {depth}'],
            textposition='middle right',
            hoverinfo='none',
            showlegend=False
        ))
        
        # Z-axis dimension line
        fig.add_trace(go.Scatter3d(
            x=[0, 0],
            y=[-5, -5],
            z=[0, height],
            mode='lines+text',
            line=dict(color='blue', width=3),
            text=['', f'Height: {height}'],
            textposition='middle right',
            hoverinfo='none',
            showlegend=False
        ))
        
        # Sort items by position for better rendering
        sorted_items = []
        for item in items:
            # Handle different item types (object or dict)
            if hasattr(item, 'position') and item.position:
                z_pos = item.position[2] if len(item.position) > 2 else 0
                sorted_items.append((item, z_pos))
            elif isinstance(item, dict) and 'position' in item:
                if isinstance(item['position'], dict):
                    z_pos = float(item['position'].get('z', 0))
                else:
                    z_pos = float(item['position'][2]) if len(item['position']) > 2 else 0
                sorted_items.append((item, z_pos))
            else:
                sorted_items.append((item, 0))
                
        # Sort by z-position for better rendering (bottom to top)
        sorted_items.sort(key=lambda x: x[1])
        
        # Add each item with enhanced 3D representation
        for idx, (item, _) in enumerate(sorted_items):
            # Extract item details based on type
            item_id = item.item_id if hasattr(item, 'item_id') else item.get('itemId', f'Item-{idx}')
            item_name = item.name if hasattr(item, 'name') else item.get('name', item_id)
            
            # Get dimensions
            if hasattr(item, 'width'):
                item_width = item.width
                item_depth = item.depth
                item_height = item.height
            else:
                item_width = float(item.get('dimensions', {}).get('width', 50))
                item_depth = float(item.get('dimensions', {}).get('depth', 50))
                item_height = float(item.get('dimensions', {}).get('height', 50))
            
            # Get priority for coloring
            priority = item.priority if hasattr(item, 'priority') else item.get('priority', 5)
                
                # Get position
            if hasattr(item, 'position') and item.position:
                item_x, item_y, item_z = item.position
            elif isinstance(item, dict) and 'position' in item:
                if isinstance(item['position'], dict):
                    item_x = float(item['position'].get('x', 0))
                    item_y = float(item['position'].get('y', 0))
                    item_z = float(item['position'].get('z', 0))
                else:
                    item_x = float(item['position'][0])
                    item_y = float(item['position'][1])
                    item_z = float(item['position'][2]) if len(item['position']) > 2 else 0
            else:
                item_x, item_y, item_z = 0, 0, 0
                
            # Get color based on priority
            color = ThreeDimensionalPacking.get_color_for_priority(priority)
            
            # Create 3D box for each item (with all 6 faces)
            # Define vertices
            x0, y0, z0 = item_x, item_y, item_z
            x1, y1, z1 = x0 + item_width, y0 + item_depth, z0 + item_height
            
            # Add cuboid as a mesh3d with multiple faces
            item_vertices = [
                [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],  # Bottom face
                [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]   # Top face
            ]
            
            # Define triangular faces
            i = [0, 0, 0, 0, 4, 4, 0, 0, 0, 0]  # First vertex of triangle
            j = [1, 2, 4, 7, 5, 6, 1, 2, 3, 7]  # Second vertex of triangle
            k = [2, 3, 5, 3, 6, 7, 5, 6, 7, 4]  # Third vertex of triangle
            
            # Add item as 3D solid
            fig.add_trace(go.Mesh3d(
                x=[v[0] for v in item_vertices],
                y=[v[1] for v in item_vertices],
                z=[v[2] for v in item_vertices],
                i=i, j=j, k=k,
                opacity=0.8,
                color=color,
                name=item_name,
                hoverinfo="text",
                hovertext=f"Item: {item_name}<br>Position: ({item_x}, {item_y}, {item_z})<br>Dimensions: {item_width}×{item_depth}×{item_height}<br>Priority: {priority}"
            ))
            
            # Add a text label for each item
            fig.add_trace(go.Scatter3d(
                x=[x0 + item_width/2],
                y=[y0 + item_depth/2],
                z=[z1 + 2],  # Slightly above the item
                mode='text',
                text=[item_name],
                textposition='top center',
                textfont=dict(size=10, color='white'),
                hoverinfo='none',
                showlegend=False
            ))
        
        # Calculate container utilization
        total_volume = width * depth * height
        used_volume = 0
        
        for item in items:
            if hasattr(item, 'width') and hasattr(item, 'depth') and hasattr(item, 'height'):
                used_volume += item.width * item.depth * item.height
            elif isinstance(item, dict) and 'dimensions' in item:
                dims = item['dimensions']
                if isinstance(dims, dict):
                    used_volume += float(dims.get('width', 0)) * float(dims.get('depth', 0)) * float(dims.get('height', 0))
                elif isinstance(dims, (list, tuple)):
                    used_volume += (
                        float(dims[0] if len(dims) > 0 else 0) *
                        float(dims[1] if len(dims) > 1 else 0) *
                        float(dims[2] if len(dims) > 2 else 0)
                    )
        
        utilization_percent = (used_volume / total_volume * 100) if total_volume > 0 else 0
        
        # Add legend for priority colors
        for p in [1, 5, 10]:
            color = ThreeDimensionalPacking.get_color_for_priority(p)
            fig.add_trace(go.Scatter3d(
                x=[None], y=[None], z=[None],
                mode='markers',
                marker=dict(color=color, size=10),
                name=f"Priority {p}/10",
                showlegend=True
            ))
        
        # Add clearer annotations for dimensions and utilization
        fig.add_annotation(
            x=0.5, y=0.01,
            xref="paper", yref="paper",
            text=f"Container Dimensions: {width} × {depth} × {height} | Utilization: {utilization_percent:.1f}% | Items: {len(items)}",
            showarrow=False,
            font=dict(size=14, color="white"),
            bgcolor="rgba(0,0,0,0.7)",
            bordercolor="white",
            borderwidth=1,
            borderpad=6,
            borderradius=5
        )
        
        # Update layout with improved settings for rotation-focused view
        fig.update_layout(
            scene=dict(
                xaxis=dict(
                    title='Width',
                    range=[-width*0.2, width*1.2],  # Add extra space for dimension labels
                    showbackground=True,
                    backgroundcolor="rgba(0,0,0,0.2)",
                    gridcolor="rgba(100,100,100,0.3)",
                    showspikes=False
                ),
                yaxis=dict(
                    title='Depth',
                    range=[-depth*0.2, depth*1.2],  # Add extra space for dimension labels
                    showbackground=True,
                    backgroundcolor="rgba(0,0,0,0.2)",
                    gridcolor="rgba(100,100,100,0.3)",
                    showspikes=False
                ),
                zaxis=dict(
                    title='Height',
                    range=[-10, height*1.2],  # Add extra space for dimension labels
                    showbackground=True,
                    backgroundcolor="rgba(0,0,0,0.2)",
                    gridcolor="rgba(100,100,100,0.3)",
                    showspikes=False
                ),
                aspectmode='manual',
                aspectratio=dict(
                    x=1, y=1, z=1  # Equal aspect ratio ensures proper 3D perspective
                ),
                camera=dict(
                    eye=dict(x=1.5, y=1.5, z=0.8),  # Better default viewing angle
                    up=dict(x=0, y=0, z=1)
                )
            ),
            legend=dict(
                yanchor="top",
                y=0.99,
                xanchor="left",
                x=0.01,
                bgcolor="rgba(0,0,0,0.7)",
                bordercolor="white",
                font=dict(color="white"),
                borderwidth=1
            ),
            margin=dict(l=0, r=0, b=0, t=40),
            template='plotly_dark',
            paper_bgcolor='rgba(20,20,20,1)',
            plot_bgcolor='rgba(20,20,20,1)',
            height=800,  # Larger figure for better visibility
            width=1000,
            title=dict(
                text=f'Container {container_id}',
                font=dict(size=24, color='white'),
                x=0.5,
                xanchor='center'
            )
        )
        
        # Save as interactive HTML with focus on rotation
        fig.write_html(
            output_path,
            include_plotlyjs='cdn',
            full_html=True,
            include_mathjax='cdn',
            config={
                'displayModeBar': True,  # Show the mode bar for basic rotation controls
                'editable': False,
                'modeBarButtonsToRemove': ['resetCameraLastSave', 'resetCameraDefault', 'hoverClosest3d'],
                'toImageButtonOptions': {
                    'format': 'png',
                    'filename': f'container_{container_id}',
                    'height': 800,
                    'width': 1000,
                    'scale': 2
                },
                'displaylogo': False,
                'scrollZoom': True,  # Enable scroll zoom
                'responsive': True
            }
        )
        
        print(f"Container visualization created at: {output_path}")
        return True
    
    except Exception as e:
        print(f"Error creating container visualization: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return False

def visualize_container(container, output_path):
    """Create a basic visualization of a container using matplotlib as fallback"""
    try:
        # Extract container dimensions
        width = container.width if hasattr(container, 'width') else 200
        depth = container.depth if hasattr(container, 'depth') else 200
        height = container.height if hasattr(container, 'height') else 200
        container_id = container.container_id if hasattr(container, 'container_id') else 'unknown'
        
        # Create a figure for container
        fig = plt.figure(figsize=(10, 8))
        ax = fig.add_subplot(111, projection='3d')
        
        # Plot container boundaries
        x, y, z = np.indices((2, 2, 2))
        container_verts = [
            [(0, 0, 0), (0, depth, 0), (width, depth, 0), (width, 0, 0)],
            [(0, 0, height), (0, depth, height), 
             (width, depth, height), (width, 0, height)],
            [(0, 0, 0), (0, 0, height), (width, 0, height), (width, 0, 0)],
            [(0, depth, 0), (0, depth, height), 
             (width, depth, height), (width, depth, 0)],
            [(0, 0, 0), (0, depth, 0), (0, depth, height), (0, 0, height)],
            [(width, 0, 0), (width, depth, 0), 
             (width, depth, height), (width, 0, height)]
        ]
        
        # Add container as a wireframe
        container_box = Poly3DCollection(container_verts, alpha=0.2, facecolor='gray', edgecolor='black', linewidth=1)
        ax.add_collection3d(container_box)
        
        # Plot each item in the container
        if hasattr(container, 'items'):
            colors = plt.cm.jet(np.linspace(0, 1, len(container.items)))
            
            for j, item in enumerate(container.items):
                if hasattr(item, 'position') and item.position:
                    # Item is an object
                    x, y, z = item.position
                    w, d, h = item.width, item.depth, item.height
                    
                    # Create item vertices
                    item_verts = [
                        [(x, y, z), (x, y+d, z), (x+w, y+d, z), (x+w, y, z)],
                        [(x, y, z+h), (x, y+d, z+h), (x+w, y+d, z+h), (x+w, y, z+h)],
                        [(x, y, z), (x, y, z+h), (x+w, y, z+h), (x+w, y, z)],
                        [(x, y+d, z), (x, y+d, z+h), (x+w, y+d, z+h), (x+w, y+d, z)],
                        [(x, y, z), (x, y+d, z), (x, y+d, z+h), (x, y, z+h)],
                        [(x+w, y, z), (x+w, y+d, z), (x+w, y+d, z+h), (x+w, y, z+h)]
                    ]
                    
                    # Add item as a colored box
                    item_box = Poly3DCollection(item_verts, alpha=0.8, facecolor=colors[j], edgecolor='black', linewidth=0.5)
                    ax.add_collection3d(item_box)
                    
                    # Add item label
                    ax.text(x + w/2, y + d/2, z + h/2, 
                            item.item_id if hasattr(item, 'item_id') else f"Item {j+1}", 
                            color='black', fontsize=8, ha='center', va='center')
        
        # Set plot limits and labels
        ax.set_xlim([0, width])
        ax.set_ylim([0, depth])
        ax.set_zlim([0, height])
        ax.set_xlabel('Width')
        ax.set_ylabel('Depth')
        ax.set_zlabel('Height')
        ax.set_title(f'Container {container_id}')
        
        # Save the figure
        plt.savefig(output_path)
        plt.close(fig)
        
        print(f"Fallback container visualization created at: {output_path}")
        return True
    except Exception as e:
        print(f"Error creating matplotlib container visualization: {e}", file=sys.stderr)
        return False

def main():
    """Main function for the 3D packing algorithm"""
    # Setup command line arguments
    parser = argparse.ArgumentParser(description='3D Packing Algorithm for Container Loading')
    parser.add_argument('containers_json', help='JSON data or file path with container information')
    parser.add_argument('items_json', help='JSON data or file path with item information')
    parser.add_argument('output_dir', help='Output directory for results and visualizations')
    parser.add_argument('--enforce-zones', action='store_true', help='Enforce zone restrictions')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    
    # Parse arguments
    try:
        args = parser.parse_args()
        print(f"Containers JSON: {args.containers_json[:50]}...")
        print(f"Items JSON: {args.items_json[:50]}...")
        print(f"Output directory: {args.output_dir}")
        print(f"Enforce zones: {args.enforce_zones}")
        print(f"Debug mode: {args.debug}")
    except Exception as e:
        print(f"Error parsing arguments: {e}")
        return False
    
    # Determine if input is a file path or JSON string
    containers_data = []
    items_data = []
    
    # Parse containers data
    if os.path.exists(args.containers_json):
        with open(args.containers_json, 'r') as f:
            containers_data = json.load(f)
    else:
        try:
            containers_data = json.loads(args.containers_json)
        except:
            print(f"Error: Could not parse containers JSON: {args.containers_json[:100]}...")
            return False
    
    # Parse items data
    if os.path.exists(args.items_json):
        with open(args.items_json, 'r') as f:
            items_data = json.load(f)
    else:
        try:
            items_data = json.loads(args.items_json)
        except:
            print(f"Error: Could not parse items JSON: {args.items_json[:100]}...")
            return False
    
    # Ensure output directory exists
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Create Container objects
    containers = []
    for container_data in containers_data:
        containers.append(Container(
            container_id=container_data.get('containerId', 'unknown'),
            width=float(container_data.get('dimensions', {}).get('width', 100)),
            depth=float(container_data.get('dimensions', {}).get('depth', 100)),
            height=float(container_data.get('dimensions', {}).get('height', 100)),
            zone=container_data.get('zone', 'A')
        ))
    
    # Create Item objects
    items = []
    for item_data in items_data:
        items.append(Item(
            item_id=item_data.get('itemId', 'unknown'),
            name=item_data.get('name', 'Item'),
            width=float(item_data.get('dimensions', {}).get('width', 10)),
            depth=float(item_data.get('dimensions', {}).get('depth', 10)),
            height=float(item_data.get('dimensions', {}).get('height', 10)),
            mass=float(item_data.get('mass', 1)),
            priority=int(item_data.get('priority', 1)),
            expiry_date=item_data.get('expiryDate', ''),
            zone=item_data.get('preferredZone', 'A')
        ))
    
    # Run the 3D packing algorithm
    packer = ThreeDimensionalPacking(
        containers=containers, 
        items=items, 
        debug=args.debug,
        enforce_zones=args.enforce_zones
    )
    
    results = packer.pack_items()
    
    # Save results to file
    output_path = os.path.join(args.output_dir, 'placement_results.json')
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Generate visualization if needed
    if len(containers) > 0 and len(items) > 0:
        container = containers[0]  # Just visualize the first container
        vis_output_path = os.path.join(args.output_dir, 'visualization.html')
        
        # Try plotly first, fall back to matplotlib
        if PLOTLY_AVAILABLE:
            success = visualize_container_plotly(container, container.items, vis_output_path)
            if not success:
                visualize_container(container, vis_output_path)
        else:
            visualize_container(container, vis_output_path)
    
    # Print results to stdout for the Node.js process to capture
    print(json.dumps(results))
    return True

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error in 3D placement algorithm: {str(e)}", file=sys.stderr)
        sys.exit(1) 