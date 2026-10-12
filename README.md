# skc-profit-analysis

基于 Excel 的电商 SKC 利润分析与售后/退款明细查看工具。纯前端实现，无需后端服务，数据全部在本机浏览器中解析处理，不上传服务器。

## 功能特性

- **多 Excel 导入**：支持导入商品利润汇总表、月度商品利润表、售后问题明细、消费者退款明细等。
- **SKC/SPU/SKU 利润分析**：自动以汇总表为基准建立 SKC 列表，按月份补充各月数据，展示利润、结算量等指标。
- **趋势图表**：基于 ECharts 的利润 / 销量趋势可视化。
- **内嵌图片提取**：支持解析 Excel 内嵌商品图片（兼容标准 drawings 与 WPS/Excel「图片放入单元格」格式）。
- **售后 / 退款明细**：按 SPU 分组展示，金额列支持排序，可筛选多关键词批量搜索。
- **SKC 管理**：分页展示、行勾选与批量复制 SKC。
- **一键启动**：双击 `start.bat` 自动安装依赖、启动服务并打开浏览器。

## 技术栈

- React 19 + TypeScript + Vite
- ECharts / echarts-for-react（图表）
- JSZip + xlsx（Excel 解析与图片提取）
- Tailwind CSS 4

## 使用

### 快速启动（Windows）

1. 确保已安装 [Node.js LTS](https://nodejs.org/)。
2. 双击 `start.bat`。
3. 脚本会自动安装依赖、启动开发服务，并打开默认浏览器访问工具页面。

### 手动开发

```bash
npm install
npm run dev      # 启动开发服务
npm run build    # 生产构建
npm run preview  # 预览生产构建
npm run lint     # 代码检查
```

## 数据与隐私

- 所有解析均在本机浏览器完成，**不会将你的数据上传到任何服务器**。
- 本项目仅包含工具代码，仓库中不含任何真实业务数据样本。

## 许可证

未指定（Private）。如需开源，请先取得代码所有者授权。