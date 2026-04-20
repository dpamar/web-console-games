#!/usr/bin/env python3
"""
Convert glorkz data file to JSON format.
This preprocesses the data once to avoid complex parsing in JavaScript.
"""

import json
import re
import sys

def read_section_lines(lines, start_idx):
    """Read lines until -1 marker"""
    result = []
    idx = start_idx
    while idx < len(lines):
        line = lines[idx]
        if line.strip().startswith('-1'):
            return result, idx + 1
        result.append(line)
        idx += 1
    return result, idx

def parse_descriptions(section_lines, keep_numbers=False):
    """Parse description sections (1, 2, 5, 6, 10, 12)"""
    descriptions = {}
    current_num = None
    current_lines = []

    for line in section_lines:
        # Match: number followed by tab or spaces, then content
        match = re.match(r'^(\d+)(?:\t|\s+)(.*)$', line)
        if not match:
            continue

        num_str, content = match.groups()
        num = int(num_str)

        # For section 5 (objects), numbers like 0, 100, 200 are property markers
        # We need to keep them in that case
        if keep_numbers:
            line_to_add = f"{num_str}\t{content}"
            # For objects: detect new object when num is not a property (0, 100, 200, etc.)
            is_new_entry = (current_num is not None and num != current_num and
                          num % 100 != 0)  # 0, 100, 200, etc. are properties
        else:
            line_to_add = content
            # For regular descriptions: any different number is a new entry
            is_new_entry = (current_num is not None and num != current_num)

        if is_new_entry:
            # New entry - save previous
            if current_lines:
                descriptions[current_num] = '\n'.join(current_lines)
            current_num = num
            current_lines = [line_to_add]
        elif current_num is None:
            # First entry
            current_num = num
            current_lines = [line_to_add]
        else:
            # Continuation or property line
            current_lines.append(line_to_add)

    # Save last entry
    if current_num is not None and current_lines:
        descriptions[current_num] = '\n'.join(current_lines)

    return descriptions

def parse_object_descriptions(section_lines):
    """Parse object descriptions (section 5) with special structure"""
    objects = {}
    current_obj = None
    current_name = None
    current_props = {}

    for line in section_lines:
        # Match: number followed by tab or spaces, then content
        match = re.match(r'^(\d+)(?:\t|\s+)(.*)$', line)
        if not match:
            continue

        num_str, content = match.groups()
        num = int(num_str)

        # If num is not divisible by 100 and not 0, it's a new object
        if num % 100 != 0:
            # Save previous object
            if current_obj is not None:
                objects[current_obj] = {
                    'name': current_name,
                    'properties': current_props
                }
            # Start new object
            current_obj = num
            current_name = content
            current_props = {}
        else:
            # Property line (000, 100, 200, 300, etc.)
            # Keep the original format with leading zeros
            prop_num = num_str
            if prop_num not in current_props:
                current_props[prop_num] = []
            current_props[prop_num].append(content)

    # Save last object
    if current_obj is not None:
        objects[current_obj] = {
            'name': current_name,
            'properties': current_props
        }

    # Join multi-line properties
    for obj_id in objects:
        for prop_num in objects[obj_id]['properties']:
            objects[obj_id]['properties'][prop_num] = '\n'.join(objects[obj_id]['properties'][prop_num])

    return objects

def parse_travel(section_lines):
    """Parse travel table (section 3)"""
    travel = {}

    for line in section_lines:
        parts = line.strip().split()
        if len(parts) < 3:
            continue

        try:
            loc = int(parts[0])
            dest_str = parts[1]
            verbs = [int(v) for v in parts[2:]]

            # Parse destination (may have conditions prefix)
            if len(dest_str) < 4:
                conditions = 0
                dest = int(dest_str)
            else:
                dest = int(dest_str[-3:])
                conditions = int(dest_str[:-3])

            if loc not in travel:
                travel[loc] = []

            for verb in verbs:
                travel[loc].append({
                    'verb': verb,
                    'dest': dest,
                    'conditions': conditions
                })
        except ValueError:
            continue

    return travel

def parse_vocabulary(section_lines):
    """Parse vocabulary (section 4) - group words by value"""
    vocab = {}

    for line in section_lines:
        parts = line.strip().split()
        if len(parts) != 2:
            continue

        try:
            value = int(parts[0])
            word = parts[1]
            if value not in vocab:
                vocab[value] = []
            vocab[value].append(word)
        except ValueError:
            continue

    return vocab

def parse_locations(section_lines):
    """Parse object locations (section 7)"""
    locations = {}

    for line in section_lines:
        parts = line.strip().split()
        if len(parts) < 2:
            continue

        try:
            obj = int(parts[0])
            loc = int(parts[1])
            fixed = int(parts[2]) if len(parts) > 2 else 0

            locations[obj] = {
                'location': loc,
                'fixed': fixed
            }
        except ValueError:
            continue

    return locations

def parse_action_defaults(section_lines):
    """Parse action verb defaults (section 8)"""
    defaults = {}

    for line in section_lines:
        parts = line.strip().split()
        if len(parts) != 2:
            continue

        try:
            verb = int(parts[0])
            message = int(parts[1])
            defaults[verb] = message
        except ValueError:
            continue

    return defaults

def parse_liquid_assets(section_lines):
    """Parse liquid assets/condition bits (section 9)"""
    liquids = []

    for line in section_lines:
        parts = line.strip().split()
        if len(parts) < 2:
            continue

        try:
            bitnum = int(parts[0])
            locs = [int(p) for p in parts[1:]]
            liquids.append({
                'bit': bitnum,
                'locations': locs
            })
        except ValueError:
            continue

    return liquids

def parse_hints(section_lines):
    """Parse hints (section 11)"""
    hints = {}

    for line in section_lines:
        parts = line.strip().split()
        if len(parts) < 6:
            continue

        try:
            hintnum = int(parts[0])
            hints[hintnum] = [int(p) for p in parts[1:6]]
        except ValueError:
            continue

    return hints

def main():
    if len(sys.argv) != 2:
        print("Usage: python glorkz_to_json.py glorkz")
        sys.exit(1)

    with open(sys.argv[1], 'r') as f:
        lines = f.readlines()

    data = {}
    idx = 0

    while idx < len(lines):
        line = lines[idx].strip()

        # Check for section marker
        if line and line.isdigit():
            section = int(line)
            idx += 1

            # Read section content
            section_lines, idx = read_section_lines(lines, idx)

            print(f"Processing section {section}...", file=sys.stderr)

            if section == 1:
                data['long_descriptions'] = parse_descriptions(section_lines)
            elif section == 2:
                data['short_descriptions'] = parse_descriptions(section_lines)
            elif section == 3:
                data['travel'] = parse_travel(section_lines)
            elif section == 4:
                data['vocabulary'] = parse_vocabulary(section_lines)
            elif section == 5:
                data['object_descriptions'] = parse_object_descriptions(section_lines)
            elif section == 6:
                data['random_messages'] = parse_descriptions(section_lines)
            elif section == 7:
                data['object_locations'] = parse_locations(section_lines)
            elif section == 8:
                data['action_defaults'] = parse_action_defaults(section_lines)
            elif section == 9:
                data['liquid_assets'] = parse_liquid_assets(section_lines)
            elif section == 10:
                data['class_messages'] = parse_descriptions(section_lines)
            elif section == 11:
                data['hints'] = parse_hints(section_lines)
            elif section == 12:
                data['magic_messages'] = parse_descriptions(section_lines)
            else:
                print(f"Warning: Unknown section {section}", file=sys.stderr)
        else:
            idx += 1

    # Output JSON
    print(json.dumps(data, indent=2))

if __name__ == '__main__':
    main()
