// Pyodide Python integration for in-browser Python execution

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<any>;
  setStdout: (options: { batched: (text: string) => void }) => void;
  setStderr: (options: { batched: (text: string) => void }) => void;
  loadPackage: (packages: string | string[]) => Promise<void>;
  globals: {
    get: (name: string) => any;
    set: (name: string, value: any) => void;
  };
  pyimport: (name: string) => any;
}

let pyodideInstance: PyodideInstance | null = null;
let isLoading = false;
let loadPromise: Promise<PyodideInstance> | null = null;

// Initialize Pyodide
export const initPyodide = async (): Promise<PyodideInstance> => {
  if (pyodideInstance) {
    return pyodideInstance;
  }
  
  if (loadPromise) {
    return loadPromise;
  }
  
  isLoading = true;
  
  loadPromise = new Promise(async (resolve, reject) => {
    try {
      // Dynamic import of pyodide
      const { loadPyodide } = await import('pyodide');
      
      const pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
        stdout: (text: string) => console.log('[Python]', text),
        stderr: (text: string) => console.error('[Python]', text),
      });
      
      pyodideInstance = pyodide as unknown as PyodideInstance;
      
      // Pre-load common packages
      await pyodideInstance.loadPackage(['pandas', 'numpy', 'micropip']);
      
      // Install additional packages via micropip
      await pyodideInstance.runPythonAsync(`
        import micropip
        await micropip.install(['pyyaml'])
      `);
      
      isLoading = false;
      resolve(pyodideInstance);
    } catch (error) {
      isLoading = false;
      console.error('Failed to initialize Pyodide:', error);
      reject(error);
    }
  });
  
  return loadPromise;
};

// Get file extension
const getFileExtension = (filePath: string): string => {
  return filePath.split('.').pop()?.toLowerCase() || '';
};

// Set up Python environment with helper functions
const setupPythonEnvironment = async (
  pyodide: PyodideInstance,
  filePath: string,
  content: string,
  saveCallback?: (data: string) => void
) => {
  const extension = getFileExtension(filePath);
  
  // Set up content variable
  pyodide.globals.set('__raw_content__', content);
  pyodide.globals.set('__file_path__', filePath);
  pyodide.globals.set('__file_extension__', extension);
  
  // Helper function to load JSON
  pyodide.globals.set('load_json', (text?: string) => {
    const contentToParse = text || pyodide.globals.get('__raw_content__');
    try {
      return JSON.parse(contentToParse);
    } catch (e) {
      throw new Error(`Invalid JSON: ${e}`);
    }
  });
  
  // Helper function to load CSV using pandas
  pyodide.globals.set('load_csv', (text?: string) => {
    pyodide.runPythonAsync(`
      import pandas as pd
      import io
      
      csv_content = __raw_content__ if not ${text ? `'${text}'` : 'None'} else '${text}'
      df = pd.read_csv(io.StringIO(csv_content))
      df
    `);
  });
  
  // Helper function to save content back
  pyodide.globals.set('save', (data: any) => {
    if (saveCallback) {
      let contentToSave: string;
      if (typeof data === 'string') {
        contentToSave = data;
      } else {
        contentToSave = JSON.stringify(data, null, 2);
      }
      saveCallback(contentToSave);
    }
  });
  
  // Helper to load YAML
  pyodide.globals.set('load_yaml', (text?: string) => {
    const contentToParse = text || pyodide.globals.get('__raw_content__');
    return pyodide.runPythonAsync(`
      import yaml
      yaml.safe_load('''${contentToParse.replace(/'/g, "'\\''")}''')
    `);
  });
  
  // Helper to load XML
  pyodide.globals.set('load_xml', (text?: string) => {
    const contentToParse = text || pyodide.globals.get('__raw_content__');
    return pyodide.runPythonAsync(`
      import xml.etree.ElementTree as ET
      root = ET.fromstring('''${contentToParse.replace(/'/g, "'\\''")}''')
      root
    `);
  });
  
  // Execute setup code
  await pyodide.runPythonAsync(`
# Set up the environment
import json
import re
import sys
from io import StringIO

# Capture output
_output_buffer = StringIO()
_original_stdout = sys.stdout
sys.stdout = _output_buffer

# Content variable
content = __raw_content__
file_path = __file_path__
file_ext = __file_extension__

# Auto-load based on file extension
if file_ext == 'json':
    try:
        data = json.loads(content)
    except:
        data = None
elif file_ext in ['csv', 'tsv']:
    try:
        import pandas as pd
        from io import StringIO as _StringIO
        data = pd.read_csv(_StringIO(content))
    except:
        data = None
else:
    data = content
`);
};

// Execute Python code
export const executePython = async (
  code: string,
  filePath: string,
  content: string,
  saveCallback?: (data: string) => void
): Promise<{ 
  success: boolean; 
  result?: any; 
  output?: string; 
  error?: string; 
  executionTime: number;
  plot?: string; // Base64 encoded plot image
}> => {
  const startTime = performance.now();
  
  try {
    const pyodide = await initPyodide();
    
    // Set up environment
    await setupPythonEnvironment(pyodide, filePath, content, saveCallback);
    
    // Reset output buffer
    await pyodide.runPythonAsync(`
_output_buffer.truncate(0)
_output_buffer.seek(0)
`);
    
    // Execute user code
    let result = await pyodide.runPythonAsync(code);
    
    // Get captured output
    const output = await pyodide.runPythonAsync(`_output_buffer.getvalue()`);
    
    // Get result representation
    let resultDisplay = null;
    let plotBase64 = null;
    
    if (result !== undefined && result !== null) {
      // Check if result is a matplotlib figure
      const resultType = await pyodide.runPythonAsync(`
import matplotlib
result_type = type(result).__name__
module_name = type(result).__module__ if hasattr(type(result), '__module__') else ''
is_figure = 'matplotlib' in module_name and 'Figure' in result_type
is_axes = 'matplotlib' in module_name and 'Axes' in result_type
result_type, is_figure, is_axes
`);
      
      if (resultType && (resultType[1] || resultType[2])) {
        // It's a matplotlib figure/axes - convert to image
        plotBase64 = await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt
import io
import base64

# Get the current figure
if 'Axes' in str(type(result)):
    fig = result.figure
else:
    fig = result

# Save to buffer
buf = io.BytesIO()
fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
buf.seek(0)
img_base64 = base64.b64encode(buf.read()).decode('utf-8')
plt.close(fig)
img_base64
`);
      } else {
        // Try to get a nice representation
        try {
          resultDisplay = await pyodide.runPythonAsync(`
import pandas as pd
import json

if isinstance(result, pd.DataFrame):
    result.to_dict('records')
elif isinstance(result, (list, dict, str, int, float, bool)):
    result
else:
    str(result)
`);
        } catch (e) {
          resultDisplay = String(result);
        }
      }
    }
    
    const executionTime = performance.now() - startTime;
    
    return {
      success: true,
      result: resultDisplay,
      output: output || undefined,
      executionTime,
      plot: plotBase64 || undefined
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime
    };
  }
};

// Get default Python code based on file type
export const getDefaultPythonCode = (filePath: string): string => {
  const extension = getFileExtension(filePath);
  
  switch (extension) {
    case 'json':
      return `# Python script for JSON data
import json

# 'content' contains the raw file content
# 'data' is auto-loaded for JSON files

print(f"Type: {type(data)}")
if isinstance(data, dict):
    print(f"Keys: {list(data.keys())}")
    print(f"Items: {len(data)}")
elif isinstance(data, list):
    print(f"Items: {len(data)}")
    print(f"\\nFirst {min(5, len(data))} items:")
    for item in data[:5]:
        print(item)

# Access the raw content if needed
# parsed = json.loads(content)

# Save changes back to file
# save(data)`;

    case 'csv':
    case 'tsv':
      return `# Python script for CSV data
import pandas as pd

# 'data' is auto-loaded as a pandas DataFrame
print(f"Shape: {data.shape}")
print(f"\\nColumns: {list(data.columns)}")
print(f"\\nFirst 5 rows:")
print(data.head())

# Filter data
# filtered = data[data['column_name'] > 100]

# Save changes back
# save(data.to_csv(index=False))`;

    case 'yaml':
    case 'yml':
      return `# Python script for YAML data
import yaml

# Parse YAML content
data = yaml.safe_load(content)

print(f"Type: {type(data)}")
if isinstance(data, dict):
    print(f"Keys: {list(data.keys())}")
    
# Save changes back
# save(yaml.dump(data, default_flow_style=False))`;

    case 'xml':
      return `# Python script for XML data
import xml.etree.ElementTree as ET

# Parse XML
root = ET.fromstring(content)

print(f"Root tag: {root.tag}")
print(f"Root attributes: {root.attrib}")

# Iterate over elements
for child in root[:5]:
    print(f"  {child.tag}: {child.attrib}")`;

    case 'txt':
    case 'log':
      return `# Python script for text/log files
import re

# 'content' contains the raw text
lines = content.split('\\n')
print(f"Total lines: {len(lines)}")

# Example: Search for patterns
# matches = re.findall(r'ERROR.*', content)
# print(f"Errors found: {len(matches)}")

# Example: Count words
words = content.split()
print(f"Total words: {len(words)}")

# Example: Filter lines
# filtered = [line for line in lines if 'keyword' in line]`;

    default:
      return `# Python script
# 'content' contains the raw file content
# 'file_path' contains the full file path
# 'file_ext' contains the file extension

print(f"File: {file_path}")
print(f"Content length: {len(content)} characters")

# Write your code here
`;
  }
};

// Check if Pyodide is ready
export const isPyodideReady = (): boolean => {
  return pyodideInstance !== null;
};

// Check if Pyodide is loading
export const isPyodideLoading = (): boolean => {
  return isLoading;
};