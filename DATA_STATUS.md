# 数据校对状态

本项目单词数据面向人教版 PEP 2024 新版初中英语教材使用。

## 当前状态

- 单词条目：由 `data.js` 维护
- 音节显示：由 `syllables.js` 维护
- 本地音频：由 `audio/` 目录维护，默认不提交到 Git
- 自动检查：运行 `python3 -B health_check.py`
- Markdown 报告：运行 `python3 -B health_check.py --report`

## 已知待办

- 部分词条缺音标，需要按教材或权威词典补齐
- 部分短语/专有名词缺本地 MP3，可用 `python3 generate_audio.py` 下载
- 跨单元重复词属于教材复现，不视为错误

## 校对原则

- 不凭记忆批量猜填音标
- 不删除跨单元重复词，除非确认同一单元重复
- 修改 `data.js` 后先运行健康检查
- 发布或换电脑时，如果需要本地音频朗读，请同步 `audio/` 文件夹
