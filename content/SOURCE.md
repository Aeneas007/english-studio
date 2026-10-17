# 经典原著来源

完整英文正文来自 Project Gutenberg。阅读器保留正文、序言和译注，按原版章节组织；目录、电子书封装说明与插图标记不作为正文朗读。含完整许可的原始下载文件保存在 sources 目录。

| 读物 | 作者 / 英译者 | 原书页面 | 本地原文件 |
|---|---|---|---|
| 爱丽丝漫游奇境 | Lewis Carroll | [官方页面](https://www.gutenberg.org/ebooks/11) | [原文件](sources/alice.txt) |
| 金银岛 | R. L. Stevenson | [官方页面](https://www.gutenberg.org/ebooks/120) | [原文件](sources/treasure.txt) |
| 秘密花园 | F. H. Burnett | [官方页面](https://www.gutenberg.org/ebooks/113) | [原文件](sources/garden.txt) |
| 悲惨世界 | Victor Hugo / Isabel Florence Hapgood | [官方页面](https://www.gutenberg.org/ebooks/135) | [原文件](sources/les-miserables.txt) |
| 伊索寓言 | Aesop / George Fyler Townsend | [官方页面](https://www.gutenberg.org/ebooks/21) | [原文件](sources/aesop.txt) |
| 快乐王子及其他故事 | Oscar Wilde | [官方页面](https://www.gutenberg.org/ebooks/902) | [原文件](sources/happy-prince.txt) |
| 圣诞颂歌 | Charles Dickens | [官方页面](https://www.gutenberg.org/ebooks/46) | [原文件](sources/christmas-carol.txt) |
| 绿野仙踪 | L. Frank Baum | [官方页面](https://www.gutenberg.org/ebooks/55) | [原文件](sources/oz.txt) |
| 柳林风声 | Kenneth Grahame | [官方页面](https://www.gutenberg.org/ebooks/289) | [原文件](sources/willows.txt) |
| 福尔摩斯冒险史 | Arthur Conan Doyle | [官方页面](https://www.gutenberg.org/ebooks/1661) | [原文件](sources/sherlock.txt) |
| 傲慢与偏见 | Jane Austen | [官方页面](https://www.gutenberg.org/ebooks/1342) | [原文件](sources/pride-prejudice.txt) |
| 八十天环游地球 | Jules Verne / George Makepeace Towle | [官方页面](https://www.gutenberg.org/ebooks/103) | [原文件](sources/around-world.txt) |

原三本获取日期为2026-10-16，新增九本为2026-10-17。原始文件中的许可及地域适用说明继续适用。难度为学习建议，全文保留原版语言，并非分级改写；朗读使用设备语音。中文书名、简介和关键词由本站整理，未附现代中文译本。

《悲惨世界》含五卷、48书、365章正文，序言、书信附录和译注独立提供，共368个阅读入口。《伊索寓言》此版本实际有313则寓言，另保留序言、生平和注释，共316个入口；原版有五组同名但正文不同的故事，按原顺序保留。《傲慢与偏见》含61章及1894年版 George Saintsbury 序言。

新增原著可用 node scripts/build-classics.mjs 从保留的原始文本重建。加 --download 会从官方地址重新下载并核对已记录的 SHA-256；来源更新时需要审阅后再更改摘要。原有三本的 ID、文件和章节顺序保持不变，方便继续阅读。
