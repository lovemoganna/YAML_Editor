// 用于保存和恢复编辑状态的函数
function saveToLocalStorage(data) {
    try {
        localStorage.setItem('yamlEditorData', JSON.stringify(data));
    } catch (e) {
        console.error('保存到本地存储失败:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('yamlEditorData');
        return savedData ? JSON.parse(savedData) : null;
    } catch (e) {
        console.error('从本地存储加载失败:', e);
        return null;
    }
}

// 在页面加载时恢复数据
document.addEventListener('DOMContentLoaded', () => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
        // 恢复保存的数据到编辑器
        renderTree(savedData);
        updateYamlPreview();
    }
});

// 在数据更新时保存
function updateYamlPreview() {
    const yamlData = generateYamlFromTree();
    const yamlText = jsyaml.dump(yamlData);
    document.getElementById('yaml-preview').textContent = yamlText;
    hljs.highlightElement(document.getElementById('yaml-preview'));
    
    // 保存到本地存储
    saveToLocalStorage(yamlData);
}

// 初始YAML数据
let data = {};

// 从localStorage读取数据
try {
  const savedData = localStorage.getItem("yamlEditorData");
  if (savedData) {
    // 移除 YAML 文档分隔符后再解析
    const cleanContent = savedData.replace(/^---\n/, "").replace(/\n---$/, "");
    data = jsyaml.load(cleanContent) || {};
  }
} catch (err) {
  console.error("读取本地存储失败:", err);
  data = {};
}

const treeContainer = document.getElementById("tree-container");
const yamlPreview = document.getElementById("yaml-preview");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const nodeKeyInput = document.getElementById("node-key");
const nodeValueInput = document.getElementById("node-value");
const isObjectCheckbox = document.getElementById("is-object");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");
const addRootBtn = document.getElementById("add-root");

let currentPath = [];
let isEditing = false;
let selectedNodePosition = null;

// 渲染树形结构
function renderTree(container, obj, path = []) {
  container.innerHTML = "";
  const ul = document.createElement("ul");
  ul.className = "pl-4"; // 添加左边距
  buildTree(ul, obj, path);
  container.appendChild(ul);
}

function buildTree(ul, obj, path = []) {
  for (const [key, value] of Object.entries(obj)) {
    const li = document.createElement("li");
    li.className = "my-2";

    const nodeDiv = document.createElement("div");
    nodeDiv.className = "flex items-center group hover:bg-gray-50 rounded p-1";

    // 添加折叠/展开图标
    const toggleBtn = document.createElement("button");
    toggleBtn.className =
      "w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none";

    const hasChildren =
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0;

    if (hasChildren) {
      toggleBtn.innerHTML =
        '<i class="fas fa-caret-right transform transition-transform duration-200"></i>';
      toggleBtn.setAttribute("data-expanded", "true");
    } else {
      toggleBtn.className += " invisible";
    }

    // 添加节点图标和样式
    const nodeIcon = document.createElement("span");
    nodeIcon.className = "w-6 h-6 flex items-center justify-center";

    if (Array.isArray(value)) {
      nodeIcon.innerHTML = '<i class="fas fa-tags text-purple-500"></i>';
      nodeIcon.title = "数组";
    } else if (typeof value === "object" && value !== null) {
      if (Object.keys(value).length === 0) {
        nodeIcon.innerHTML = '<i class="fas fa-cube text-gray-400"></i>';
        nodeIcon.title = "空对象";
      } else {
        nodeIcon.innerHTML = '<i class="fas fa-sitemap text-blue-500"></i>';
        nodeIcon.title = "对象";
      }
    } else {
      nodeIcon.innerHTML = '<i class="fas fa-key text-green-500"></i>';
      nodeIcon.title = "键值";
    }

    // 添加节点文本
    const nodeText = document.createElement("span");
    nodeText.className = "ml-2 flex-grow font-medium";

    // 如果是键值对，显示
    if (value !== null && typeof value !== "object") {
      nodeText.innerHTML = `<span class="text-gray-700">${key}</span><span class="mx-2 text-gray-400">:</span><span class="text-blue-600">${value}</span>`;
    } else if (Array.isArray(value)) {
      nodeText.innerHTML = `<span class="text-gray-700">${key}</span><span class="mx-2 text-gray-400">:</span><span class="text-purple-600">[${value.join(
        ", "
      )}]</span>`;
    } else {
      nodeText.innerHTML = `<span class="text-gray-700">${key}</span>`;
    }

    // 添加操作按钮组
    const actionGroup = document.createElement("div");
    actionGroup.className =
      "opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1";

    // 添加子节点按钮
    const addBtn = document.createElement("button");
    addBtn.className = "w-6 h-6 rounded-full hover:bg-blue-100 text-blue-600";
    addBtn.innerHTML = '<i class="fas fa-plus-circle"></i>';
    addBtn.title = "添加子节点 (Alt+A)";

    // 编辑按钮
    const editBtn = document.createElement("button");
    editBtn.className =
      "w-6 h-6 rounded-full hover:bg-green-100 text-green-600";
    editBtn.innerHTML = '<i class="fas fa-pen-to-square"></i>';
    editBtn.title = "编辑节点 (Alt+E)";

    // 删除按钮
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "w-6 h-6 rounded-full hover:bg-red-100 text-red-600";
    deleteBtn.innerHTML = '<i class="fas fa-trash-can"></i>';
    deleteBtn.title = "删除节点 (Alt+D)";

    // 组装节点
    nodeDiv.appendChild(toggleBtn);
    nodeDiv.appendChild(nodeIcon);
    nodeDiv.appendChild(nodeText);
    actionGroup.appendChild(addBtn);
    actionGroup.appendChild(editBtn);
    actionGroup.appendChild(deleteBtn);
    nodeDiv.appendChild(actionGroup);
    li.appendChild(nodeDiv);

    // 如果有子节点，创建子节点容器
    if (hasChildren) {
      const childContainer = document.createElement("div");
      childContainer.className = "ml-6 mt-1";
      const childUl = document.createElement("ul");
      childUl.className = "border-l-2 border-gray-200";
      buildTree(childUl, value, [...path, key]);
      childContainer.appendChild(childUl);
      li.appendChild(childContainer);

      // 添加折叠/展开功能
      toggleBtn.addEventListener("click", () => {
        const isExpanded = toggleBtn.getAttribute("data-expanded") === "true";
        toggleBtn.setAttribute("data-expanded", !isExpanded);
        childContainer.style.display = isExpanded ? "none" : "block";
        toggleBtn.querySelector("i").style.transform = isExpanded
          ? "rotate(0)"
          : "rotate(90deg)";
      });

      // 初始状态设置为展开
      toggleBtn.querySelector("i").style.transform = "rotate(90deg)";
    }

    // 添加事件监听
    addBtn.addEventListener("click", () =>
      openModal("添加子节点", [...path, key])
    );
    editBtn.addEventListener("click", () =>
      openModal("编辑节点", [...path, key], true)
    );
    deleteBtn.addEventListener("click", () => {
      if (confirm("确定要删除此节点吗？")) {
        deleteNode([...path, key]);
        renderTree(treeContainer, data);
        updatePreview();
      }
    });

    ul.appendChild(li);
  }
}

// 打开模态框
function openModal(title, path, isEdit = false) {
  modalTitle.textContent = title;
  currentPath = path;

  if (isEdit) {
    const parent = getNodeByPath(data, path.slice(0, -1));
    const currentKey = path[path.length - 1];
    const currentValue = parent[currentKey];

    // 设置当前键名
    nodeKeyInput.value = currentKey;

    // 判断值的类型
    const isCurrentObject =
      typeof currentValue === "object" && currentValue !== null;
    const isArray = Array.isArray(currentValue);

    // 设置复选框状态
    isObjectCheckbox.checked = isCurrentObject && !isArray;

    // 设置值输入框
    nodeValueInput.disabled = isCurrentObject && !isArray;
    if (isArray) {
      nodeValueInput.value = currentValue.join(", ");
    } else if (!isCurrentObject) {
      nodeValueInput.value = currentValue;
    } else {
      nodeValueInput.value = "";
    }
  } else {
    nodeKeyInput.value = "";
    nodeValueInput.value = "";
    isObjectCheckbox.checked = true;
    nodeValueInput.disabled = true;
  }

  isEditing = isEdit;
  modal.classList.remove("hidden");
}

// 关闭模态框
function closeModal() {
  modal.classList.add("hidden");
  nodeKeyInput.value = "";
  nodeValueInput.value = "";
  isObjectCheckbox.checked = false;
  nodeValueInput.disabled = false;
  currentPath = [];
  isEditing = false;
  selectedNodePosition = null;
}

// 删除节点
function deleteNode(path) {
  const parent = getNodeByPath(data, path.slice(0, -1));
  const key = path[path.length - 1];
  if (parent && parent.hasOwnProperty(key)) {
    delete parent[key];
  }
}

// 修改 updatePreview 函数
function updatePreview() {
  try {
    // 使用 js-yaml 的 dump 方法，配置特定选项
    const yamlString = jsyaml.dump(data, {
      indent: 2, // 设置缩进为2个空格
      lineWidth: -1, // 禁用自动换行
      noRefs: true, // 禁用引用
      quotingType: '"', // 使用双引号
      forceQuotes: false, // 只在必要时使用引号
      flowLevel: -1, // 使用块格式
      styles: {
        "!!null": "empty",
        "!!map": "block", // 对象使用块格式
        "!!seq": "flow", // 数组使用流式格式 [...]
        "!!int": "plain", // 整数不使用引号
        "!!float": "plain", // 浮点数不使用引号
      },
    });

    // 格式化 YAML 字符串，确保正确的格式
    const formattedYaml = yamlString
      // 移除开头和结尾的分隔符
      .replace(/^---\n/, "")
      .replace(/\n---$/, "")
      // 修复数组格式，确保数组在同一行并正确闭合
      .replace(/:\n\s+- /g, ": [")
      .replace(/\n\s+- /g, ", ")
      // 确保每行以 ] 结尾的数组正确闭合
      .replace(/: \[(.*?)(?=\n|$)/g, ": [$1]")
      // 移除多余的空行
      .replace(/\n\n+/g, "\n")
      // 移除数字键值对的引号
      .replace(/"(\d+)":\s+"(\d+)"/g, "$1: $2")
      // 移除纯数字的引号
      .replace(/:\s+"(\d+)"/g, ": $1")
      .replace(/"(\d+)":/g, "$1:");

    yamlPreview.innerHTML = hljs.highlight(formattedYaml, {
      language: "yaml",
    }).value;

    localStorage.setItem("yamlEditorData", formattedYaml);
  } catch (err) {
    console.error("更新预览失败:", err);
  }
}

// 保存节点
saveBtn.addEventListener("click", () => {
  const key = nodeKeyInput.value.trim();
  let value = nodeValueInput.value.trim();
  const isObject = isObjectCheckbox.checked;

  if (!key) {
    alert("键名不能为空");
    return;
  }

  // 修改父节点路径的获取方式
  let parentPath;
  if (isEditing) {
    // 如果是编辑模式，使用当前节点的父节点路径
    parentPath = currentPath.slice(0, -1);
  } else {
    // 如果是添加模式，直接使用当前路径作为父节点路径
    parentPath = currentPath;
  }

  const parent = getNodeByPath(data, parentPath);

  // 检查父节点
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) {
    alert("父节点必须是一个对象");
    return;
  }

  // 处理不同类型的值
  if (isObject) {
    value = {};
  } else {
    // 尝试将数字字符串转换为数字
    const numValue = Number(value);
    if (!isNaN(numValue) && value !== "") {
      value = numValue;
    } else if (value.includes(",")) {
      value = [value];
    }
  }

  // 检查键名是否已存在（编辑模式下排除自身）
  const currentKey = currentPath[currentPath.length - 1];
  if (!isEditing && parent.hasOwnProperty(key)) {
    alert("键名已存在");
    return;
  }

  // 删除原有键值对（如果是编辑模式）
  if (isEditing && currentKey !== key) {
    delete parent[currentKey];
  }

  // 添加新键值对
  parent[key] = value;

  renderTree(treeContainer, data);
  updatePreview();
  closeModal();
});

// 取消按钮
cancelBtn.addEventListener("click", closeModal);

// 添加根节点
addRootBtn.addEventListener("click", () => {
  selectedNodePosition = null; // 设为 null 表示添加到末尾
  openModal("添加根节点", []);
});

// 获取节点路径
function getNodeByPath(obj, path) {
  if (!path || path.length === 0) {
    return obj;
  }

  let current = obj;
  for (let key of path) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }
  return current;
}

// 监听类型选择
isObjectCheckbox.addEventListener("change", (e) => {
  nodeValueInput.disabled = e.target.checked;
  if (e.target.checked) {
    nodeValueInput.value = "";
  }
});

// 初始渲染
renderTree(treeContainer, data);
updatePreview();

// 添加复制功能
const copyBtn = document.getElementById("copy-btn");
copyBtn.addEventListener("click", () => {
  try {
    // 直接从 yamlPreview 元素获取文本内容
    const yamlStr = yamlPreview.textContent;
    navigator.clipboard.writeText(yamlStr).then(() => {
      // 可以添加一个复制成功的提示
      const originalTitle = copyBtn.title;
      copyBtn.title = "复制成功！";
      setTimeout(() => {
        copyBtn.title = originalTitle;
      }, 2000);
    });
  } catch (err) {
    console.error("复制失败:", err);
    alert("复制失败，请重试");
  }
});

// 添加导出功能
const exportBtn = document.getElementById("export-btn");
exportBtn.addEventListener("click", () => {
  const yamlStr = yamlPreview.textContent;
  const blob = new Blob([yamlStr], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "exported.yaml";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// 添加导入功能
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");

importBtn.addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const yamlContent = e.target.result;
        // 移除开始和结束的分隔符（如果存在）
        const cleanContent = yamlContent
          .replace(/^---\n/, "")
          .replace(/\n---$/, "");
        const parsedData = jsyaml.load(cleanContent);

        // 处理解析后的数据
        data = processArrays(parsedData) || {};
        renderTree(treeContainer, data);
        updatePreview();
        event.target.value = "";
      } catch (err) {
        alert("YAML 解析错误: " + err);
      }
    };
    reader.readAsText(file);
  }
});

// 添加清除按钮功能
document.getElementById("clear-btn").addEventListener("click", () => {
  if (confirm("确定要清除所有数据吗？此操作不可恢复。")) {
    data = {};
    localStorage.removeItem("yamlEditorData");
    renderTree(treeContainer, data);
    updatePreview();
  }
});

// 添加快捷键支持
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + N: 新建根节点
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    openModal("添加根节点", []);
  }

  // Esc: 关闭模态框
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    e.preventDefault();
    closeModal();
  }

  // Enter: 在模态框中保存
  if (e.key === "Enter" && !modal.classList.contains("hidden")) {
    e.preventDefault();
    saveBtn.click();
  }
});

// 在节点渲染时添加快捷键提示（可选功能，根据需要启用）
// function renderNode(node, path = []) {
//   // ...实现拖拽等功能
// }

// 处理批量导入逻辑
const batchImportBtn = document.getElementById("batch-import-btn");
const batchImportModal = document.getElementById("batch-import-modal");

batchImportBtn.addEventListener("click", () => {
  batchImportModal.classList.remove("hidden");
});

batchImportModal.querySelector(".cancel-btn").addEventListener("click", () => {
  batchImportModal.classList.add("hidden");
});

batchImportModal.querySelector(".import-btn").addEventListener("click", () => {
  const text = batchImportModal.querySelector("textarea").value;
  try {
    // 移除开始和结束的分隔符（如果存在）
    const cleanContent = text.replace(/^---\n/, "").replace(/\n---$/, "");
    const parsedData = jsyaml.load(cleanContent);

    // 处理解析后的数据
    data = processArrays(parsedData) || {};
    renderTree(treeContainer, data);
    updatePreview();
    batchImportModal.classList.add("hidden");
  } catch (err) {
    alert("YAML 解析错误: " + err);
  }
});

// 修改导入文件的处理逻辑
function processArrays(obj) {
  if (!obj || typeof obj !== "object") return obj;

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (Array.isArray(value)) {
      // 如果数组中的元素包含逗号，或者是需要保持原格式的字符串
      if (
        value.some((item) => typeof item === "string" && item.includes(","))
      ) {
        // 保持为单个字符串的数组
        obj[key] = [value.join(", ")];
      } else if (value.length === 1 && typeof value[0] === "string") {
        // 单个字符串值，保持数组格式
        obj[key] = value;
      } else {
        // 多个独立字符串值，合并为一个数组
        obj[key] = [value.join(", ")];
      }
    } else if (typeof value === "object") {
      processArrays(value);
    }
  });
  return obj;
}
