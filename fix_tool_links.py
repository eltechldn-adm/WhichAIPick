import os
import re

# Tool name mapping (display name -> slug)
TOOL_MAP = {
    # From CSV IDs - will be populated dynamically
}

def load_tools_from_json():
    """Load tool names and IDs from JSON"""
    tools = {}
    json_path = '/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick/data/tools.json'
    try:
        import json
        with open(json_path, 'r', encoding='utf-8') as f:
            tools_list = json.load(f)
            for tool in tools_list:
                tool_id = tool.get('id', '').strip()
                tool_name = tool.get('name', '').strip()
                if tool_id and tool_name:
                    # Add exact name (lowercase)
                    tools[tool_name.lower()] = tool_id
                    # Add without spaces/punctuation
                    clean_name = re.sub(r'[^a-z0-9]', '', tool_name.lower())
                    tools[clean_name] = tool_id
                    # Add first word for compound names
                    first_word = tool_name.lower().split()[0] if ' ' in tool_name else None
                    if first_word and len(first_word) > 2:
                        tools[first_word] = tool_id
    except Exception as e:
        print(f"Error loading JSON: {e}")
    return tools

def find_tool_slug(text, tools_dict):
    """Find tool slug from link text"""
    text_lower = text.lower().strip()
    
    # Direct match
    if text_lower in tools_dict:
        return tools_dict[text_lower]
    
    # Try without punctuation
    clean_text = re.sub(r'[^a-z0-9\s]', '', text_lower)
    if clean_text in tools_dict:
        return tools_dict[clean_text]
    
    # Check for common variations
    variations = [
        text_lower.replace(' ', ''),
        text_lower.replace('-', ''),
        text_lower.split()[0] if ' ' in text_lower else text_lower,  # First word
    ]
    
    for var in variations:
        if var in tools_dict:
            return tools_dict[var]
    
    return None

def fix_tool_links_in_file(filepath, tools_dict):
    """Fix tool links in a single HTML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = []
        
        # Pattern: <a href="/tools">ToolName</a>
        # We want to replace /tools with /tool?id=<slug>
        pattern = r'<a\s+href="(/tools|/tools/)"\s*>([^<]+)</a>'
        
        def replace_link(match):
            url = match.group(1)
            link_text = match.group(2)
            
            # Try to find the tool
            tool_slug = find_tool_slug(link_text, tools_dict)
            
            if tool_slug:
                new_url = f'/tool?id={tool_slug}'
                changes_made.append(f"  {link_text} -> {new_url}")
                return f'<a href="{new_url}">{link_text}</a>'
            else:
                # Keep as is if we can't find it
                return match.group(0)
        
        content = re.sub(pattern, replace_link, content)
        
        # Also handle variations with or without slash
        # and compound tool mentions like "Cursor or GitHub Copilot"
        # Pattern for compound: <a href="/tools">Tool1 or Tool2</a>  
        compound_pattern = r'<a\s+href="(/tools|/tools/)"\s*>([^<]+(?:\s+or\s+[^<]+)+)</a>'
        
        def replace_compound(match):
            url = match.group(1)
            link_text = match.group(2)
            
            # Split by "or" and try to find first tool
            parts = re.split(r'\s+or\s+', link_text, flags=re.IGNORECASE)
            if parts:
                tool_slug = find_tool_slug(parts[0], tools_dict)
                if tool_slug:
                    new_url = f'/tool?id={tool_slug}'
                    changes_made.append(f"  {link_text} -> {new_url} (compound)")
                    return f'<a href="{new_url}">{link_text}</a>'
            
            return match.group(0)
        
        content = re.sub(compound_pattern, replace_compound, content)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            if changes_made:
                print(f"\nFixed {filepath}:")
                for change in changes_made:
                    print(change)
            return True
        return False
    
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def scan_and_fix():
    """Scan all HTML files and fix tool links"""
    tools_dict = load_tools_from_json()
    print(f"Loaded {len(tools_dict)} tool mappings")
    
    base_path = '/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick'
    dirs_to_scan = ['use-cases', 'make-money', 'academy', 'blog', 'compare']
    
    files_fixed = 0
    for d in dirs_to_scan:
        dir_path = os.path.join(base_path, d)
        if not os.path.exists(dir_path):
            continue
        
        for root, _, files in os.walk(dir_path):
            for file in files:
                if file.endswith('.html'):
                    filepath = os.path.join(root, file)
                    if fix_tool_links_in_file(filepath, tools_dict):
                        files_fixed += 1
    
    print(f"\n✅ Total files fixed: {files_fixed}")

if __name__ == "__main__":
    scan_and_fix()
