import { tradeDraft } from "./trade-technical-content.mjs";
import { siteTradeDraft } from "./trade-site-content.mjs";

export const tradeTracks = [
  { id: "hvac", bookId: "au-trade-hvac", title: "HVAC 暖通空调", englishTitle: "HVAC on the Job", level: "B1", color: "#547e83", symbol: "❄", description: "从预约到场、描述空调问题，到零件报价和客户交接，练习听懂并确认现场信息。" },
  { id: "electrical", bookId: "au-trade-electrical", title: "电工现场英语", englishTitle: "Electrical Site English", level: "B1", color: "#9b7a42", symbol: "ϟ", description: "用清楚的英语确认任务、图纸和电气设备名称，练习请求确认、问题上报与完工沟通。" },
  { id: "plumbing", bookId: "au-trade-plumbing", title: "水工与管道英语", englishTitle: "Plumbing Conversations", level: "A2", color: "#597a9b", symbol: "◉", description: "上门报修、漏水描述、停水沟通、配件下单和工作交接，把日常水工表达说清楚。" },
  { id: "building", bookId: "au-trade-building", title: "建筑工地英语", englishTitle: "Everyday Building Site English", level: "A2", color: "#9a6e55", symbol: "⌂", description: "从第一天报到到收工交接，练习图纸核对、材料数量、团队协作和澳洲工地口语。" },
];

export const tradeUnits = tradeTracks.flatMap((track) =>
  [...tradeDraft, ...siteTradeDraft].filter((unit) => unit.track === track.id).map((unit, chapter) => ({
    ...unit,
    chapter,
    bookId: track.bookId,
    contextLabel: `${track.title} · 场景 ${chapter + 1}`,
    questionLabel: "场景理解与表达",
    readingLabel: "返回现场对话",
    resultPrompt: "回到现场对话再听一遍，也可以用自己的情况练习本课角色扮演。",
  })),
);

export const tradeBooks = tradeTracks.map((track) => ({
  id: track.bookId,
  title: track.englishTitle,
  zh: track.title,
  author: "English Studio",
  genre: "澳洲职业英语",
  collection: "trades",
  track: track.id,
  level: track.level,
  color: track.color,
  symbol: track.symbol,
  description: track.description + "本站原创双语现场对话，配合课程讲解、术语与练习使用。",
  chapters: tradeUnits.filter((unit) => unit.track === track.id).map((unit) => ({
    title: unit.englishTitle,
    zh: unit.title,
    lines: unit.items.map(([en, zh], index) => [en, zh, null, index === 0]),
  })),
}));
