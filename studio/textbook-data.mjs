const question = (prompt, options, answer, explanation) => ({ prompt, options, answer, explanation });

const volumes = [
  [
    {
      title: "A Garden Gate", zh: "花园门口的新朋友", focus: "be 动词与身份介绍",
      tip: "I 配 am，单数人或物配 is，you 和复数配 are。例如：I am a volunteer. / The gates are green.",
      writing: "用六句话介绍一个你熟悉的地方和其中两个人，至少各用一次 am、is、are。",
      items: [
        ["I am a new volunteer.", "我是一名新志愿者。"],
        ["This is our community garden.", "这是我们的社区花园。"],
        ["The gate is green.", "大门是绿色的。"],
        ["My name is Leo.", "我的名字叫利奥。"],
        ["Rosa is our garden leader.", "罗莎是我们的花园负责人。"],
        ["We are ready for our first day.", "我们准备好迎接第一天了。"],
      ],
      questions: [
        question("补全句子：I ___ a new volunteer.", ["is", "are", "am", "be"], 2, "主语 I 在一般现在时中与 am 搭配。"),
        question("哪一句与故事一致？", ["The gate is green.", "Leo is the garden leader.", "Rosa is a new gate.", "The garden is closed."], 0, "第三句明确说大门是绿色的；花园负责人是 Rosa。"),
        question("把两个人合为主语：Leo and Rosa ___ ready.", ["am", "is", "be", "are"], 3, "Leo and Rosa 表示两个人，是复数主语，因此用 are。"),
      ],
    },
    {
      title: "The Paper Map", zh: "一起找路", focus: "人称代词与指代关系",
      tip: "he、she 指代单个人，it 指代一个物品，we 包含说话者，they 指代其他多个人或物。先找前文的名词，再选择代词。",
      writing: "写一段和朋友出门的经历，用 he 或 she 介绍朋友，再用 we 描写你们共同做的事。",
      items: [
        ["Maya has a paper map.", "玛雅有一张纸地图。"],
        ["She shows it to her brother Ben.", "她把地图给弟弟本看。"],
        ["He points to a small park.", "他指着一个小公园。"],
        ["I meet them beside the station.", "我在车站旁遇见他们。"],
        ["We walk to the park together.", "我们一起步行去公园。"],
        ["They thank me for the company.", "他们感谢我的陪伴。"],
      ],
      questions: [
        question("第二句中的 She 指谁？", ["Ben", "Maya", "the map", "the station"], 1, "前一句介绍 Maya，下一句用 She 继续指代她。"),
        question("She shows it 中的 it 指什么？", ["the park", "Ben", "the paper map", "the company"], 2, "it 是宾格代词，代替前一句提到的单数物品 a paper map。"),
        question("哪一个代词包含叙述者“我”？", ["We", "He", "She", "They"], 0, "We 表示我们，包含说话者；They 表示他们，不包含说话者。"),
      ],
    },
    {
      title: "The Blue Umbrella", zh: "蓝色雨伞的主人", focus: "形容词性物主代词与名词性物主代词",
      tip: "my、your、her、our 后面要接名词；mine、yours、hers、ours 可以独立使用。例如：This is my bag. / The bag is mine.",
      writing: "选三件日常物品，分别用“物主代词＋名词”和独立物主代词说明归属。",
      items: [
        ["A blue umbrella is beside my chair.", "一把蓝色雨伞在我的椅子旁。"],
        ["My umbrella is yellow.", "我的雨伞是黄色的。"],
        ["Nina looks inside her bag.", "妮娜朝她的包里看。"],
        ["Her umbrella is not there.", "她的雨伞不在那里。"],
        ["The blue umbrella is hers.", "这把蓝色雨伞是她的。"],
        ["Our short mystery is over.", "我们这场小小的谜案结束了。"],
      ],
      questions: [
        question("补全：Nina looks inside ___ bag.", ["hers", "she", "her", "mine"], 2, "bag 是名词，前面用形容词性物主代词 her；hers 后面不再接 bag。"),
        question("用一个词表达“这把雨伞是她的”：The umbrella is ___.", ["her", "she", "our", "hers"], 3, "空格后没有名词，应使用可独立表示“她的东西”的 hers。"),
        question("叙述者自己的雨伞是什么颜色？", ["Blue", "Yellow", "Green", "Red"], 1, "第二句 My umbrella is yellow. 明确说明叙述者的雨伞是黄色的。"),
      ],
    },
    {
      title: "Saturday Plant Sale", zh: "周六植物义卖", focus: "可数名词复数与不规则变化",
      tip: "一般名词加 s；box 这类词加 es；child 的复数是 children。数量大于一时，名词及 be 动词通常都需要变为复数。",
      writing: "列出你想在小集市上买的五样东西，把数量和正确的复数形式写出来。",
      items: [
        ["Two children help at the plant sale.", "两个孩子在植物义卖会上帮忙。"],
        ["Three boxes are under the table.", "三个箱子在桌子下面。"],
        ["The boxes hold small pots.", "箱子里装着小花盆。"],
        ["Red flowers are near the door.", "红色的花在门边。"],
        ["A woman buys two plants.", "一位女士买了两株植物。"],
        ["The children carry the pots to her car.", "孩子们把花盆搬到她的车旁。"],
      ],
      questions: [
        question("box 的复数是什么？", ["boxs", "boxes", "boxies", "box's"], 1, "box 以 x 结尾，复数通常加 es，变成 boxes。"),
        question("补全：Two ___ help at the sale.", ["child", "childs", "children", "childes"], 2, "child 的不规则复数是 children，不是在词尾直接加 s。"),
        question("哪一个句子正确使用了复数名词和 be 动词？", ["Three box is here.", "Three boxes is here.", "Three box are here.", "Three boxes are here."], 3, "Three 后的名词用复数 boxes，复数主语与 are 搭配。"),
      ],
    },
    {
      title: "A Repair Shop Routine", zh: "修车铺的一天", focus: "一般现在时与第三人称单数",
      tip: "一般现在时常描述习惯。主语为单数第三人称时，动词通常加 s；否定句用 doesn't 后，动词恢复原形：She doesn't open on Sundays.",
      writing: "描述一个人的工作或周末习惯，写三句肯定句和一句 doesn't 否定句。",
      items: [
        ["Eva runs a small bicycle shop.", "伊娃经营一家小自行车店。"],
        ["She opens the door at eight.", "她八点开门。"],
        ["Her brother brings fresh water every morning.", "她的哥哥每天早晨送来干净的水。"],
        ["They check the bicycles before lunch.", "他们午饭前检查自行车。"],
        ["Eva does not work on Sundays.", "伊娃星期日不工作。"],
        ["She rides by the river on her day off.", "她在休息日沿着河边骑车。"],
      ],
      questions: [
        question("补全日常习惯：She ___ the door at eight.", ["opens", "open", "opening", "to open"], 0, "She 是第三人称单数，描述习惯时用 opens。"),
        question("哪一句否定句正确？", ["Eva doesn't works on Sundays.", "Eva don't work on Sundays.", "Eva doesn't work on Sundays.", "Eva not works on Sundays."], 2, "第三人称单数否定用 doesn't，后接动词原形 work。"),
        question("故事用 every morning 表达什么？", ["只发生过一次", "每天早晨的习惯", "此刻正在发生", "明天的计划"], 1, "every morning 是重复频率，和一般现在时一起描述日常习惯。"),
      ],
    },
    {
      title: "Before the Lantern Walk", zh: "灯笼游行之前", focus: "现在进行时：be＋动词 ing",
      tip: "现在进行时描述眼前正在发生的动作：They are hanging lanterns. 注意 be 动词要随主语变化，不能只写 hanging。",
      writing: "观察身边或想象一个活动现场，写六个此刻正在发生的动作。",
      items: [
        ["We are getting ready for the lantern walk.", "我们正在为灯笼游行做准备。"],
        ["Tom is hanging lights above the gate.", "汤姆正在大门上方挂灯。"],
        ["Two neighbours are painting a sign.", "两位邻居正在画一块标牌。"],
        ["I am carrying a box of paper lanterns.", "我正搬着一箱纸灯笼。"],
        ["A little girl is choosing a red lantern.", "一个小女孩正在挑选一盏红灯笼。"],
        ["The sky is getting dark around us.", "我们周围的天空正渐渐暗下来。"],
      ],
      questions: [
        question("补全：Tom ___ hanging lights now.", ["am", "are", "be", "is"], 3, "Tom 是单数人名，进行时用 is hanging。"),
        question("哪一句表示“我此刻正在搬箱子”？", ["I carry a box every day.", "I am carrying a box.", "I carried a box yesterday.", "I will carry a box tomorrow."], 1, "am carrying 是现在进行时；其余选项分别描述习惯、过去和将来。"),
        question("谁正在画标牌？", ["Tom", "The little girl", "Two neighbours", "The narrator alone"], 2, "第三句明确说 Two neighbours are painting a sign。"),
      ],
    },
    {
      title: "The Missing Lantern", zh: "找回丢失的灯笼", focus: "一般过去时与常用不规则动词",
      tip: "yesterday、last night 等明确过去时间常与一般过去时搭配。规则动词可加 ed；go、find、give 分别变为 went、found、gave。",
      writing: "写昨天发生的一件小事，按先后顺序使用四个过去式动词。",
      items: [
        ["Yesterday, I went back to the garden.", "昨天，我回到了花园。"],
        ["A red lantern was on the wet path.", "一盏红灯笼在潮湿的小路上。"],
        ["I picked it up carefully.", "我小心地把它捡起来。"],
        ["The girl from the walk came through the gate.", "参加游行的那个女孩从大门走进来。"],
        ["I gave the lantern to her.", "我把灯笼交给了她。"],
        ["She smiled and thanked me.", "她笑了笑，向我道谢。"],
      ],
      questions: [
        question("go 在故事中的过去式是什么？", ["goed", "went", "gone", "going"], 1, "go 的一般过去式是 went；gone 是过去分词。"),
        question("把“我把灯笼交给她”写成过去时。", ["I give the lantern to her.", "I giving the lantern to her.", "I gave the lantern to her.", "I gives the lantern to her."], 2, "give 的一般过去式是 gave，与已经发生的故事相符。"),
        question("故事里先发生哪一件事？", ["The narrator picked up the lantern.", "The girl thanked the narrator.", "The narrator gave away the lantern.", "The girl came through the gate."], 0, "叙述者先捡起灯笼，然后女孩到来，最后归还并收到感谢。"),
      ],
    },
    {
      title: "Next Sunday's Picnic", zh: "下周日的野餐", focus: "将来计划与临时决定",
      tip: "be going to 常表示已有的计划；will 可表达当场决定。例：We are going to bring fruit. / The bag is heavy; I will help you.",
      writing: "安排一次小活动，写三个已有计划，再写一句临时提出的帮助。",
      items: [
        ["We are going to have a picnic next Sunday.", "我们打算下周日去野餐。"],
        ["Rosa is going to bring bread and fruit.", "罗莎打算带面包和水果。"],
        ["Ben is going to choose a quiet place.", "本打算选一个安静的地方。"],
        ["I am going to take a big blanket.", "我打算带一条大毯子。"],
        ["Rosa says her basket is heavy.", "罗莎说她的篮子很重。"],
        ["I will carry it for her.", "我来替她提篮子。"],
      ],
      questions: [
        question("补全已有计划：We ___ going to have a picnic.", ["is", "am", "are", "be"], 2, "We 是复数主语，所以 be going to 中用 are。"),
        question("听到篮子很重后，叙述者当场提供帮助，说了什么？", ["I will carry it for her.", "I carried it last week.", "I never carry baskets.", "I am a basket."], 0, "最后一句使用 will，表达听到情况后提出的帮助。"),
        question("谁负责选择野餐地点？", ["Rosa", "The narrator", "The little girl", "Ben"], 3, "第三句明确写 Ben is going to choose a quiet place。"),
      ],
    },
  ],
  [
    {
      title: "The Last Ferry", zh: "最后一班渡船", focus: "过去叙事的时间顺序与动词变化",
      tip: "叙述已结束的事件可用一般过去时，并用 first、then、finally 等连接顺序。read 的过去式拼写不变，发音变化；reach 的过去式是 reached。",
      writing: "用六句话叙述一次出行中的小意外，交代起因、经过和结果。",
      items: [
        ["Last Friday, Mina reached the harbour ten minutes before the last ferry.", "上周五，米娜在最后一班渡船开航前十分钟到达了港口。"],
        ["She read the timetable and waited beside the wrong gate.", "她读了时刻表，却在错误的登船口旁等候。"],
        ["A cleaner noticed her ticket and pointed towards the far pier.", "一位清洁工注意到她的船票，指向远处的码头。"],
        ["Mina thanked him and ran along the waterfront.", "米娜谢过他，沿着水边跑去。"],
        ["The crew saw her and held the gate open for a moment.", "船员看见她，暂时没有关上登船口。"],
        ["She finally found a seat as the harbour lights disappeared behind the boat.", "当港口的灯光消失在船后时，她终于找到了一个座位。"],
      ],
      questions: [
        question("为什么 Mina 差点错过渡船？", ["She lost her ticket.", "She waited at the wrong gate.", "The harbour was closed.", "The cleaner sent her home."], 1, "第二句交代她等在错误的登船口，而不是遗失船票。"),
        question("补全过去叙事：The crew ___ her and held the gate open.", ["see", "seen", "saw", "seeing"], 2, "see 的一般过去式是 saw，与并列的 held 保持过去叙事一致。"),
        question("哪一项准确概括事件顺序？", ["Boarded, waited, read", "Ran, arrived, bought a boat", "Left, cleaned, returned", "Arrived, waited, ran, boarded"], 3, "她先到港口并等候，得到提示后跑向正确码头，最后上船。"),
      ],
    },
    {
      title: "A Bench for Everyone", zh: "大家的长椅", focus: "过去进行时与现在完成时的区别",
      tip: "was/were doing 描写过去某一刻正在进行的背景；have/has done 强调截至现在的成果。例：We were painting when it rained. / We have finished the bench.",
      writing: "写一个已经取得进展的项目：两句描述过去场景，两句说明截至现在的成果。",
      items: [
        ["Our street has needed a public bench for a long time.", "我们这条街很久以来一直需要一张公共长椅。"],
        ["Last month, we were discussing the idea when a carpenter offered some wood.", "上个月，我们正在讨论这个想法时，一位木匠提出提供一些木料。"],
        ["While he was measuring the boards, I was clearing the work space.", "他测量木板时，我正在清理工作场地。"],
        ["Since then, we have built a strong bench beneath the old tree.", "从那以后，我们已经在老树下造好了一张结实的长椅。"],
        ["We have not painted it yet because the wood is still damp.", "我们还没有给它刷漆，因为木料仍然潮湿。"],
        ["Several neighbours have already stopped to admire our work.", "已经有几位邻居停下脚步，欣赏我们的成果。"],
      ],
      questions: [
        question("补全过去的进行背景：We ___ the idea when he offered some wood.", ["have discussed", "are discussing", "discuss tomorrow", "were discussing"], 3, "when 引出过去发生的插入事件，were discussing 表示当时持续进行的讨论。"),
        question("哪一句强调截至现在已经完成的成果？", ["We have built a strong bench.", "We were measuring the boards.", "We will buy some wood.", "We are discussing next year."], 0, "have built 是现在完成时，强调长椅已经造好这一现有成果。"),
        question("为什么长椅还没有刷漆？", ["Nobody can find the tree.", "The wood is still damp.", "The carpenter refused to help.", "The neighbours dislike benches."], 1, "第五句用 because 明确说明木料仍然潮湿。"),
      ],
    },
    {
      title: "The Rooftop Visit", zh: "屋顶农场之约", focus: "将来安排、意图与预测",
      tip: "现在进行时可以表示已经约定的将来安排，如 We are meeting at nine tomorrow.；be going to 可表达意图；will 可用来作预测。不要只凭时间词判断时态。",
      writing: "安排一次参观，说明预约好的时间、你打算做的事，以及对天气的一项预测。",
      items: [
        ["Our class is visiting a rooftop farm on Tuesday morning.", "我们班已安排在周二上午参观一座屋顶农场。"],
        ["We are meeting the guide outside the library at nine.", "我们约好九点在图书馆外与导游会合。"],
        ["I am going to ask how the farmers save water.", "我打算询问农场的人如何节水。"],
        ["My friend thinks the roof will be hotter than the street.", "我的朋友认为屋顶会比街上更热。"],
        ["The guide is bringing extra hats for anyone who needs one.", "导游已安排为需要的人多带一些帽子。"],
        ["We hope the visit will give us ideas for our school garden.", "我们希望这次参观能给学校花园带来灵感。"],
      ],
      questions: [
        question("哪一句用现在进行时表达已经约好的将来安排？", ["I asked a question yesterday.", "We are meeting the guide at nine tomorrow.", "The roof is made of stone.", "We have visited the farm before."], 1, "are meeting 加将来时间 tomorrow，可以表达已经约定的会面安排。"),
        question("叙述者打算重点了解什么？", ["How to build a library", "Where to buy a roof", "Why hats are expensive", "How the farmers save water"], 3, "第三句的意图是询问农场如何节约用水。"),
        question("My friend thinks the roof will be hotter 是什么表达？", ["过去的既定事实", "现在正在进行的动作", "对将来情况的预测", "禁止别人上屋顶"], 2, "thinks 加 will be 表达说话者对参观时屋顶温度的预测。"),
      ],
    },
    {
      title: "Two Ways Home", zh: "两条回家的路", focus: "比较级、最高级与比较标准",
      tip: "两者比较常用比较级＋than；在三者及以上的范围里选出最突出者常用 the＋最高级。短不一定快，要关注句子给出的比较维度。",
      writing: "比较两条路线或两种出行方式，用距离、舒适度和安全性三个标准给出选择。",
      items: [
        ["There are two cycling routes between my office and home.", "我的办公室与家之间有两条骑行路线。"],
        ["The road through the centre is shorter than the riverside path.", "穿过市中心的道路比河边小路更短。"],
        ["However, the riverside path is quieter and has fewer traffic lights.", "不过，河边小路更安静，红绿灯也更少。"],
        ["On busy evenings, it is often the faster choice.", "在繁忙的傍晚，它往往是更快的选择。"],
        ["The steep hill near my flat is the hardest part of either route.", "我公寓附近的陡坡是两条路线中最难的一段。"],
        ["I choose the river whenever I have enough daylight to enjoy it.", "只要天色还足够亮，让我能享受河景，我就选择河边路线。"],
      ],
      questions: [
        question("补全比较：The central road is ___ than the riverside path.", ["shorter", "shortest", "more short", "the short"], 0, "两条路线比较距离，使用 short 的比较级 shorter，并与 than 搭配。"),
        question("为什么更长的河边路线在忙碌的傍晚反而可能更快？", ["It has no river.", "It is always downhill.", "It has fewer traffic lights.", "It is inside the office."], 2, "第三句说明河边路线红绿灯更少，这解释了第四句的速度优势。"),
        question("the hardest part 中为什么用最高级？", ["因为 part 是复数", "因为正在比较两个人", "因为时间一定在过去", "因为在路线的所有路段中选出最困难的一段"], 3, "这里比较的是路线中的多个路段，选出最难的一段，因此使用 the hardest。"),
      ],
    },
    {
      title: "A First Shift at the Museum", zh: "博物馆的第一班岗", focus: "情态动词：义务、建议与许可",
      tip: "must 常表达强制要求，should 常表达建议，can 可表达许可或能力；情态动词后用动词原形。例如：Visitors must leave food outside.",
      writing: "为一个公共场所写一条强制规定、一条温馨建议和一条许可说明。",
      items: [
        ["On my first morning as a museum volunteer, the manager showed me the rules.", "我第一天早晨在博物馆做志愿者时，经理向我介绍了规定。"],
        ["Visitors must keep food outside the exhibition rooms.", "参观者必须把食物留在展厅外。"],
        ["They can take photographs in the main hall without a flash.", "他们可以在主厅里拍照，但不能使用闪光灯。"],
        ["I should speak slowly when a visitor is learning English.", "遇到正在学英语的参观者时，我应该放慢语速。"],
        ["I do not have to answer every question by myself.", "我不必独自回答每一个问题。"],
        ["If I need help, I can call the information desk.", "如果需要帮助，我可以联系咨询台。"],
      ],
      questions: [
        question("哪一个词在本文中表示“强制要求”？", ["can", "should", "must", "might"], 2, "Visitors must keep food outside 是规定，must 表达必须遵守的要求。"),
        question("把 do not have to answer 理解为哪一项最准确？", ["禁止回答", "不必回答", "一定答错", "已经回答过"], 1, "do not have to 表示没有必要或没有义务，并不等于 must not 的禁止。"),
        question("哪一句符合情态动词后的形式规则？", ["Visitors can take photographs.", "Visitors can takes photographs.", "Visitors can taking photographs.", "Visitors can to take photographs."], 0, "can 后接动词原形 take，不加 s、ing 或 to。"),
      ],
    },
    {
      title: "The Library Chairs", zh: "图书馆椅子的第二次生命", focus: "一般过去时与一般现在时的被动语态",
      tip: "被动语态用 be＋过去分词，突出动作接受者。过去用 was/were repaired，现在的常规过程可用 is/are checked；动作执行者可用 by 补充。",
      writing: "描述一件物品从制作、检查到使用的过程，至少写三个被动语态句子。",
      items: [
        ["Twenty old chairs were found in the library store room last winter.", "去年冬天，人们在图书馆储藏室里发现了二十把旧椅子。"],
        ["The wooden frames were repaired by a local workshop.", "木制椅架由一家本地工坊修好了。"],
        ["New covers were made from strong blue fabric.", "新椅套用结实的蓝色布料制成。"],
        ["Now the chairs are used in the children's reading corner.", "现在，这些椅子被放在儿童阅读角使用。"],
        ["They are checked every month so that loose screws can be tightened.", "人们每月检查这些椅子，以便及时拧紧松动的螺丝。"],
        ["A small label explains how the project kept useful furniture out of the rubbish.", "一张小标签介绍了这个项目如何让有用的家具免遭丢弃。"],
      ],
      questions: [
        question("补全过去的被动语态：The frames ___ by a workshop last winter.", ["repair", "were repaired", "are repairing", "have repair"], 1, "动作发生在 last winter，主语 frames 是动作接受者且为复数，因此用 were repaired。"),
        question("by a local workshop 说明了什么？", ["动作发生的时间", "椅子的颜色", "动作的执行者", "修理的价格"], 2, "被动语态中的 by 短语可以指出是谁执行了动作。"),
        question("哪一句描述现在定期进行的被动动作？", ["They repaired a chair yesterday.", "The chairs broke last winter.", "The workshop will close.", "The chairs are checked every month."], 3, "are checked 是一般现在时被动语态，every month 表明它是定期进行的检查。"),
      ],
    },
    {
      title: "A Photograph of the Bridge", zh: "桥上的旧照片", focus: "关系从句中的 who、which 与 where",
      tip: "who 常引导修饰人的关系从句，which 常修饰物；where 引导的从句描述在某个地点发生的事。先找被修饰的先行词，再判断从句缺少什么成分。",
      writing: "介绍一个人、一件物品和一个地点，分别各用一个关系从句补充信息。",
      items: [
        ["At the market, I met a woman who collects old photographs of our town.", "在集市上，我遇到一位收集本镇老照片的女士。"],
        ["She showed me a picture which had been taken before the new bridge was built.", "她给我看了一张新桥建成前拍摄的照片。"],
        ["The narrow crossing in the picture stood where the footpath now ends.", "照片中的狭窄通道位于如今步行道的尽头。"],
        ["A boy who lived beside the river appeared near the wooden rail.", "一个住在河边的男孩出现在木栏杆旁。"],
        ["The woman recognised him as her father, who was only ten at the time.", "这位女士认出他就是自己的父亲，那时他只有十岁。"],
        ["We walked to the place where he had stood and took a new photograph.", "我们走到他曾站过的地方，拍了一张新照片。"],
      ],
      questions: [
        question("补全：a woman ___ collects old photographs", ["where", "when", "which", "who"], 3, "先行词 woman 是人，关系词在从句中作主语，因此用 who。"),
        question("the place where he had stood 中的 where 主要补充什么信息？", ["站立这一动作发生的地点", "照片的价格", "父亲的年龄", "拍照所用的相机"], 0, "where 在关系从句中表示地点，相当于 at which。"),
        question("照片里的男孩与收藏照片的女士是什么关系？", ["她的儿子", "她的父亲", "她的老师", "她的邻居，文中明确没有亲属关系"], 1, "第五句说明她认出了自己的父亲，拍照时他才十岁。"),
      ],
    },
    {
      title: "A Market for a Rainy Day", zh: "给雨天留一个计划", focus: "真实条件与假设条件",
      tip: "真实的将来条件常用 If＋一般现在时，主句用 will；较不现实的设想常用 If＋过去式，主句用 would。例：If it rains, we will move inside.",
      writing: "为一个户外活动写两条现实应急方案，再写一个暂时不现实的理想方案。",
      items: [
        ["Our street is planning an outdoor book market for next month.", "我们这条街正计划下个月举办一次户外图书集市。"],
        ["If the weather stays dry, we will put the tables beside the square.", "如果天气保持干燥，我们就把桌子摆在广场旁。"],
        ["If it rains, the community hall will give us a smaller space indoors.", "如果下雨，社区会堂会为我们提供一处较小的室内场地。"],
        ["We will tell the sellers about any change before they leave home.", "我们会在卖家出门前告知他们所有变动。"],
        ["If we had a larger budget, we would hire a covered tent.", "如果我们的预算更多，就会租一顶带遮盖的帐篷。"],
        ["For now, a careful plan is more useful than an expensive dream.", "目前，周全的计划比昂贵的梦想更有用。"],
      ],
      questions: [
        question("补全真实的将来条件：If it ___, we will move indoors.", ["rains", "will rain", "rained", "raining"], 0, "第一条件句的 if 从句通常用一般现在时，即 rains，主句再用 will。"),
        question("If we had a larger budget, we would hire a tent 表达什么？", ["已经发生的租帐篷事实", "每个月固定发生的习惯", "与当前预算条件不同的设想", "必须立即执行的命令"], 2, "had 与 would hire 构成假设条件，表达目前预算不足时的理想方案。"),
        question("按照现有计划，下雨时集市将搬到哪里？", ["The railway station", "The community hall", "A large hired tent", "The sellers' homes"], 1, "第三句说明下雨时由 community hall 提供室内场地；帐篷只是预算充足时的设想。"),
      ],
    },
  ],
  [
  {
    "title": "One Crossing After Sunset",
    "zh": "日落后的那次渡河",
    "focus": "复杂叙事：背景、转折与结果",
    "tip": "过去进行时交代当时的背景，一般过去时推动事件。While Lena was waiting, a boat appeared. 中，was waiting 是持续的背景，appeared 是新发生的动作。用 when 或 while 把两层叙事连接起来。",
    "writing": "写一次计划被打乱却得到帮助的经历。用 while 交代背景，再用 when 引出变化，最后说明结果。",
    "items": [
      [
        "Lena was walking towards the river when the last ferry pulled away.",
        "莉娜正朝河边走去，这时末班渡船离岸了。"
      ],
      [
        "While she was studying the timetable, a woman stopped beside her with a basket.",
        "她正在研究时刻表时，一位提着篮子的女士在她身旁停了下来。"
      ],
      [
        "The woman explained that her brother was bringing a small boat across the river.",
        "那位女士解释说，她哥哥正开着一条小船过河来。"
      ],
      [
        "Lena helped carry the basket down the steps, and the woman offered her a seat.",
        "莉娜帮忙把篮子搬下台阶，那位女士便邀请她搭船。"
      ],
      [
        "As the lights on the far bank grew brighter, Lena finally stopped checking her watch.",
        "当对岸的灯光越来越亮时，莉娜终于不再不停地看表了。"
      ],
      [
        "She reached home late, but the unexpected crossing became her favourite part of the day.",
        "她到家晚了，但这次意外的渡河却成了她当天最喜欢的经历。"
      ]
    ],
    "questions": [
      {
        "prompt": "哪一部分交代末班船离开时正在发生的背景？",
        "options": [
          "The ferry pulled away.",
          "Lena was walking towards the river.",
          "She reached home late.",
          "The woman offered her a seat."
        ],
        "answer": 1,
        "explanation": "was walking 是过去进行时，描述船离开时正在持续的动作；pulled away 是发生的新事件。"
      },
      {
        "prompt": "莉娜为什么能搭上小船？",
        "options": [
          "She bought another ferry ticket.",
          "She knew the boat driver already.",
          "She helped a woman who then offered her a seat.",
          "She asked the ferry to turn back."
        ],
        "answer": 2,
        "explanation": "第四句把帮助搬篮子与获邀搭船连在一起；文中没有另买船票或让渡船返回。"
      },
      {
        "prompt": "选出适合叙事的句子。",
        "options": [
          "While she was waiting, a boat appeared.",
          "While she waiting, a boat appear.",
          "While she waited, a boat appearing.",
          "While she is waiting yesterday, a boat appears."
        ],
        "answer": 0,
        "explanation": "过去进行时 was waiting 交代背景，过去式 appeared 推进故事，其余选项有时态或结构错误。"
      }
    ]
  },
  {
    "title": "The Letter Behind the Shelf",
    "zh": "书架后的一封信",
    "focus": "时态一致与过去事件的先后关系",
    "tip": "回忆过去时，用一般过去时叙述主线；需要回到主线之前的动作时，可用 had＋过去分词。Mara found a letter that her grandfather had written. 表示写信早于发现信，而不是所有过去动作都必须用过去完成时。",
    "writing": "讲述发现一张旧照片或一件旧物的经历。先说明你何时发现，再用两句过去完成时交代它更早的来历。",
    "items": [
      [
        "When Mara moved an old shelf, she found a letter inside the wall.",
        "玛拉挪动一个旧书架时，在墙里发现了一封信。"
      ],
      [
        "Her grandfather had written it before he left the village to study in the city.",
        "她的祖父在离开村子进城求学之前写下了这封信。"
      ],
      [
        "In the letter, he described a reading room that the villagers had built together.",
        "他在信中描述了一间由村民们合力建成的阅览室。"
      ],
      [
        "Mara had always thought that the room was a shop until she saw his drawing.",
        "在看到祖父的画之前，玛拉一直以为那个房间曾是一家商店。"
      ],
      [
        "She showed the letter to her neighbour, who remembered borrowing books there as a child.",
        "她把信拿给邻居看，邻居还记得小时候在那里借书的事。"
      ],
      [
        "That evening, they put a copy of the drawing beside the village noticeboard.",
        "那天晚上，她们把那幅画的复制件放在了村里的布告栏旁。"
      ]
    ],
    "questions": [
      {
        "prompt": "哪件事发生在 Mara 发现信之前？",
        "options": [
          "She showed it to her neighbour.",
          "They displayed a copy of the drawing.",
          "Her grandfather wrote the letter.",
          "She moved the shelf."
        ],
        "answer": 2,
        "explanation": "had written 明确把祖父写信放在 found 之前；展示信和画则是发现之后的事件。"
      },
      {
        "prompt": "补全：Mara found a letter that her grandfather ___ many years earlier.",
        "options": [
          "writes",
          "had written",
          "is writing",
          "has writing"
        ],
        "answer": 1,
        "explanation": "发现是过去的主线事件，更早的写信可用过去完成时 had written 表明先后关系。"
      },
      {
        "prompt": "为什么不把结尾写成 they had put a copy beside the noticeboard？",
        "options": [
          "过去完成时不能用于复数主语。",
          "put 没有过去分词。",
          "所有过去动作都只能用进行时。",
          "放置画的复制件是主线中随后发生的动作。"
        ],
        "answer": 3,
        "explanation": "That evening 继续推进发现信之后的主线，用一般过去时 put 即可；过去完成时通常用于回溯更早的动作。"
      }
    ]
  },
  {
    "title": "A Radio at the Repair Table",
    "zh": "维修桌上的收音机",
    "focus": "现在分词与过去分词作补充说明",
    "tip": "句首分词短语的逻辑主语应与主句主语一致。Carrying a radio, Sam entered the room. 中是 Sam 在搬。过去分词常表示被动：Repaired by volunteers, the radio worked again. 表示收音机被修好了。",
    "writing": "描述一次修理或制作活动。用一个现在分词短语说明人正在做什么，再用一个过去分词短语说明物品受到什么处理。",
    "items": [
      [
        "Carrying his grandfather's radio, Sam entered the community repair room.",
        "萨姆搬着祖父的收音机，走进了社区维修室。"
      ],
      [
        "A volunteer sitting near the window cleared a space on her table.",
        "一位坐在窗边的志愿者在桌上腾出了一块地方。"
      ],
      [
        "Unsure how to explain the fault, Sam simply turned the silent radio on.",
        "萨姆不确定该怎样描述故障，便直接打开了这台没有声音的收音机。"
      ],
      [
        "The volunteer found a loose wire hidden behind a small metal cover.",
        "志愿者在一个小金属盖后面发现了一根松动的电线。"
      ],
      [
        "Repaired with a single careful adjustment, the radio filled the room with music.",
        "经过一次仔细的调整，修好的收音机让音乐充满了房间。"
      ],
      [
        "Smiling at the familiar tune, Sam promised to bring his grandfather next time.",
        "萨姆听着熟悉的曲调露出笑容，答应下次带祖父一起来。"
      ]
    ],
    "questions": [
      {
        "prompt": "第一句里，谁在 Carrying his grandfather's radio？",
        "options": [
          "Sam",
          "The volunteer",
          "The window",
          "The room"
        ],
        "answer": 0,
        "explanation": "句首 carrying 短语的逻辑主语是主句主语 Sam，不能理解成房间在搬收音机。"
      },
      {
        "prompt": "a loose wire hidden behind a cover 中 hidden 的含义是什么？",
        "options": [
          "电线正在藏起别人",
          "电线将来会消失",
          "电线位于盖子后面，处于被遮住的状态",
          "盖子正在听音乐"
        ],
        "answer": 2,
        "explanation": "hidden 是 hide 的过去分词，修饰 wire，表达电线被隐藏或遮在盖子后面的状态。"
      },
      {
        "prompt": "哪一句的分词短语与主语搭配正确？",
        "options": [
          "Carrying the radio, the door opened by Sam.",
          "Walking into the room, Sam noticed a free table.",
          "Sitting by the window, the radio was carried by Sam.",
          "Repairing the wire, the music became louder."
        ],
        "answer": 1,
        "explanation": "Walking 和 noticed 的动作主语都是 Sam。其余句子的句首动作与主句主语不一致。"
      }
    ]
  },
  {
    "title": "An Interview by the Greenhouse",
    "zh": "温室旁的采访",
    "focus": "间接引语：陈述、疑问与时间指代",
    "tip": "转述过去说过的话时，常把 am/is 改为 was，把 will 改为 would，并按语境调整 today、tomorrow 等指代。间接问句使用陈述语序：She asked whether he needed help.，不是 whether did he need help。",
    "writing": "回想一次简短对话，把其中一句陈述和一个问题改写成间接引语，检查人称、时间和语序。",
    "items": [
      [
        "On Monday, school reporter Iona interviewed Mr Bell beside his greenhouse.",
        "星期一，校园小记者艾奥娜在贝尔先生的温室旁采访了他。"
      ],
      [
        "He told her that he was testing a new way to collect rainwater.",
        "他告诉她，自己正在试验一种收集雨水的新方法。"
      ],
      [
        "Iona asked whether the school could borrow his design for its garden.",
        "艾奥娜问学校能否借用他的设计来改造花园。"
      ],
      [
        "He said that he would bring a drawing the following day.",
        "他说自己第二天会带来一张图纸。"
      ],
      [
        "She also asked him why he had started gardening, and he mentioned his grandmother.",
        "她还问他为什么当初开始种植，他提到了自己的祖母。"
      ],
      [
        "In her report, Iona kept his practical advice and left out an unrelated story about a missing hat.",
        "艾奥娜在报道中保留了他的实用建议，删掉了一个与主题无关的丢帽子的故事。"
      ]
    ],
    "questions": [
      {
        "prompt": "Mr Bell 当时说“I will bring a drawing tomorrow.”，文中怎样转述？",
        "options": [
          "He said he will brought a drawing yesterday.",
          "He said he would bring a drawing the following day.",
          "He said would he bring a drawing tomorrow.",
          "He told that he bring a drawing now."
        ],
        "answer": 1,
        "explanation": "在这段过去叙事中，will 对应 would，tomorrow 对应 the following day，间接陈述保留陈述语序。"
      },
      {
        "prompt": "选出语序正确的间接问句。",
        "options": [
          "She asked why had he started gardening.",
          "She asked why did he start gardening.",
          "She asked why he had started gardening.",
          "She asked why he had start gardening."
        ],
        "answer": 2,
        "explanation": "间接问句用 why＋主语＋谓语；he had started 的语序和动词形式都正确。"
      },
      {
        "prompt": "Iona 为什么删掉丢帽子的故事？",
        "options": [
          "它与报道的主题无关。",
          "Mr Bell 没有温室。",
          "学校禁止所有故事。",
          "她只记录了自己的问题。"
        ],
        "answer": 0,
        "explanation": "最后一句明确把帽子故事称为 unrelated，说明她按报道主题选择信息。"
      }
    ]
  },
  {
    "title": "A Small Change at the Corner",
    "zh": "街角的小改变",
    "focus": "强调结构：It was…that 与 What…was",
    "tip": "It was＋被强调部分＋that… 可以突出人、地点或时间。What the walkers needed was a clear sign. 把“真正需要的东西”放到焦点位置。did＋动词原形也能加强语气：The change did help.。",
    "writing": "写一次很小却有用的改进。分别用 It was…that 和 What…was 强调关键的人或真正的需求。",
    "items": [
      [
        "For months, visitors to the park kept missing the narrow entrance beside the bakery.",
        "一连几个月，公园访客总是错过面包店旁那道狭窄的入口。"
      ],
      [
        "The council discussed a new map, but a delivery rider suggested a simpler solution.",
        "市政人员讨论过制作新地图，但一位送货骑手提出了更简单的办法。"
      ],
      [
        "It was the entrance, not the whole route, that people could not see clearly.",
        "人们看不清的是入口，而不是整条路线。"
      ],
      [
        "What the corner needed was a small sign above the gate.",
        "那个街角真正需要的是大门上方的一块小标牌。"
      ],
      [
        "The bright sign did help, and fewer visitors asked the baker for directions.",
        "醒目的标牌确实起了作用，向面包师问路的访客变少了。"
      ],
      [
        "At the next meeting, the rider explained that she had noticed the problem while making deliveries.",
        "在下一次会议上，那位骑手解释说，她是在送货时注意到这个问题的。"
      ]
    ],
    "questions": [
      {
        "prompt": "It was the entrance…that… 重点强调什么？",
        "options": [
          "所有路线都必须重建",
          "入口是人们看不清的部分",
          "面包店关门了",
          "会议的时间很重要"
        ],
        "answer": 1,
        "explanation": "It was the entrance…that… 把 the entrance 放在强调位置，与 not the whole route 形成明确比较。"
      },
      {
        "prompt": "补全强调语气：The bright sign did ___.",
        "options": [
          "helped",
          "helping",
          "helps",
          "help"
        ],
        "answer": 3,
        "explanation": "强调助动词 did 后面接动词原形 help，时态已经由 did 表达。"
      },
      {
        "prompt": "哪一句用 What…was 准确概括提出的办法？",
        "options": [
          "What the corner needed was a small sign.",
          "What was the corner needed a small sign.",
          "What the corner need were a small sign.",
          "What a small sign needed the corner was."
        ],
        "answer": 0,
        "explanation": "What the corner needed 整体作主语，was a small sign 说明真正需要的事物。"
      }
    ]
  },
  {
    "title": "A Bench Before the Cold Week",
    "zh": "寒冷来临前的一张长椅",
    "focus": "让步关系：although、despite 与 nevertheless",
    "tip": "although 后接完整分句，despite 后接名词或动名词。Although the space was small… 与 Despite the small space… 都能引出让步。连接两句时，可用 nevertheless 表示“尽管如此”，但要保持句子结构完整。",
    "writing": "描述一个有困难但仍然完成的计划。用 although 写一句，再用 despite 把同样的困难换一种方式表达。",
    "items": [
      [
        "Although the bus shelter was small, several older neighbours wanted a place to sit there.",
        "虽然公交候车亭很小，几位年长的邻居还是希望那里能有个坐下的地方。"
      ],
      [
        "A local carpenter offered to make a narrow bench from wood left over from another job.",
        "当地一位木匠提出，用另一项工程剩下的木料做一张窄长椅。"
      ],
      [
        "Despite the short deadline, two volunteers helped him finish it before the cold week began.",
        "尽管时间紧迫，两位志愿者还是帮助他在寒冷的一周开始前完成了长椅。"
      ],
      [
        "The first design blocked the path; nevertheless, the group found a better position after measuring again.",
        "最初的设计挡住了通道；尽管如此，大家重新测量后还是找到了更合适的位置。"
      ],
      [
        "The finished bench was plain, yet it made waiting for the bus much more comfortable.",
        "完工的长椅很朴素，但它让等车舒服多了。"
      ],
      [
        "When the carpenter visited later, someone had placed a little thank-you card beside it.",
        "木匠后来再去看时，有人已经在长椅旁放了一张小小的感谢卡。"
      ]
    ],
    "questions": [
      {
        "prompt": "哪一句 correctly 使用 despite？",
        "options": [
          "Despite the deadline was short, they finished.",
          "Despite of the short deadline, they finished.",
          "Despite the short deadline, they finished.",
          "Despite the deadline is short but they finished."
        ],
        "answer": 2,
        "explanation": "despite 后接名词短语 the short deadline；它本身不接 of，也不能直接跟完整主谓句。"
      },
      {
        "prompt": "第一种设计出了什么问题？",
        "options": [
          "它挡住了通道。",
          "没有人需要座位。",
          "木料完全用完了。",
          "感谢卡被吹走了。"
        ],
        "answer": 0,
        "explanation": "第四句说明 The first design blocked the path，随后通过重新测量找到更好位置。"
      },
      {
        "prompt": "nevertheless 在第四句中表达什么关系？",
        "options": [
          "补充完全相同的信息",
          "说明价格上涨的原因",
          "列出动作发生的地点",
          "承认遇到问题，同时转向后来克服问题的结果"
        ],
        "answer": 3,
        "explanation": "nevertheless 表示尽管如此，连接“设计挡路”与“仍找到更好位置”，突出让步与转折。"
      }
    ]
  },
  {
    "title": "Clues Beside the Garden Gate",
    "zh": "花园门边的线索",
    "focus": "根据证据推断：must have、might have 与 can't have",
    "tip": "must have＋过去分词表示对过去情况的强推断，might have 表示一种可能，can't have 表示认为不可能。三者都不是直接目击事实；推断强度必须与已有证据相配。",
    "writing": "想象一个物品被移动的小谜题。列出两条证据，分别用 might have 和 must have 作推断，再说明怎样核实。",
    "items": [
      [
        "At dawn, Priya found the garden's watering cans lined up beside the locked gate.",
        "黎明时，普里娅发现花园的喷壶整齐地排在锁着的大门旁。"
      ],
      [
        "The cans were wet inside, so someone must have used them before she arrived.",
        "喷壶里面还是湿的，因此在她到来之前一定有人用过它们。"
      ],
      [
        "She thought that a volunteer might have returned after the evening meeting.",
        "她猜可能有位志愿者在晚间会议后回来过。"
      ],
      [
        "Her brother could not have done it, because he had been away since Monday.",
        "这不可能是她哥哥做的，因为他从星期一起就一直不在。"
      ],
      [
        "A note under one handle finally revealed that the night gardener had watered the new plants.",
        "一个把手下面的便条最终揭示，是夜班园丁浇了新种的植物。"
      ],
      [
        "Priya smiled at her guesses and wrote the gardener a short message of thanks.",
        "普里娅想到自己的那些猜测笑了笑，给园丁写了一条简短的感谢信息。"
      ]
    ],
    "questions": [
      {
        "prompt": "might have returned 表达什么？",
        "options": [
          "作者已经证实志愿者回来过。",
          "这是普里娅想到的一种可能。",
          "志愿者将来一定会回来。",
          "回来这件事绝不可能发生。"
        ],
        "answer": 1,
        "explanation": "might have 用来推测过去的一种可能，文章后来用便条提供了更直接的解释。"
      },
      {
        "prompt": "什么证据排除了她哥哥？",
        "options": [
          "喷壶是绿色的。",
          "大门旁有脚印。",
          "便条没有署名。",
          "他从星期一起就一直不在。"
        ],
        "answer": 3,
        "explanation": "第四句 because 引出明确理由：哥哥在外，因此不可能在那个时间使用喷壶。"
      },
      {
        "prompt": "补全对过去的强推断：Someone must have ___ the cans.",
        "options": [
          "use",
          "uses",
          "used",
          "using"
        ],
        "answer": 2,
        "explanation": "must have 后接过去分词 used，表示根据证据对过去作出强推断。"
      }
    ]
  },
  {
    "title": "Making the Invitation Clear",
    "zh": "把邀请写清楚",
    "focus": "篇章连接：转折、因果、同时与总结",
    "tip": "连接词先服务于逻辑，再服务于形式。however 引出转折，therefore 引出推论或结果，meanwhile 引出同时发生的另一条线。检查每个连接词前后真正的关系，不要只靠句子顺序选择。",
    "writing": "用六句话说明一个小计划怎样改进。至少使用 however、therefore 和 finally，并检查它们对应的逻辑。",
    "items": [
      [
        "At first, the reading club advertised its evening with a long message full of book titles.",
        "起初，读书会用一条塞满书名的长消息宣传晚间活动。"
      ],
      [
        "However, several readers said that they could not find the starting time.",
        "然而，几位读者表示，他们找不到活动开始的时间。"
      ],
      [
        "The organiser therefore moved the time and meeting place to the first line.",
        "因此，组织者把时间和集合地点移到了第一行。"
      ],
      [
        "Meanwhile, another member made a simple map for people who had never visited the hall.",
        "与此同时，另一位成员为从未到过礼堂的人画了一张简明地图。"
      ],
      [
        "As a result, fewer people needed to ask for directions on the evening itself.",
        "结果，活动当晚需要问路的人减少了。"
      ],
      [
        "Finally, the club saved the clearer version as a model for its next invitation.",
        "最后，读书会保存了这个更清楚的版本，作为下次邀请的范本。"
      ]
    ],
    "questions": [
      {
        "prompt": "第二句为什么使用 However？",
        "options": [
          "它列举了与首句相同的书名。",
          "它说明另一件事同时发生。",
          "它引出与宣传努力不一致的问题。",
          "它证明所有读者都迟到了。"
        ],
        "answer": 2,
        "explanation": "首句介绍宣传消息，第二句却指出消息不清楚的问题，因此用 however 表示转折。"
      },
      {
        "prompt": "哪一项最适合代替第三句中的 therefore？",
        "options": [
          "for that reason",
          "at the same time",
          "in contrast",
          "for example"
        ],
        "answer": 0,
        "explanation": "therefore 与 for that reason 都表达基于前述问题采取行动的因果关系。"
      },
      {
        "prompt": "Meanwhile 把哪两条线连接起来？",
        "options": [
          "过去和将来完全相同的活动",
          "删除所有邀请与取消活动",
          "读者问路与购买新书",
          "组织者调整消息和另一位成员制作地图"
        ],
        "answer": 3,
        "explanation": "meanwhile 表示在组织者改消息的同时，另一位成员也在制作地图。"
      }
    ]
  }
],
  [
  {
    "title": "A Longer Evening",
    "zh": "把建议变成可检验的论点",
    "focus": "论点、证据与推论",
    "tip": "论点回答‘主张什么’，证据回答‘凭什么这样说’，推论说明两者如何相连。The library should stay open later 是主张；记录到的到馆次数是证据。A small trial may help 是较谨慎的建议，不等于保证长期成功。",
    "writing": "选择一个你想改进的公共服务，写一个主张、两条可收集的证据和一个可能推翻主张的结果。",
    "items": [
      [
        "The library committee proposed a six-week trial of later opening hours, arguing that residents who worked during the day needed another chance to visit.",
        "图书馆委员会提议试行六周延长开放时间，理由是白天上班的居民需要另一个到访机会。"
      ],
      [
        "Rather than treating a petition as proof of future demand, the librarian suggested recording actual evening visits and the additional staffing costs.",
        "馆员建议记录实际夜间到馆人数及额外人力成本，而不是把请愿书当作未来需求的证明。"
      ],
      [
        "During the trial, the building welcomed more visitors after dinner, although the figures alone did not explain whether they were new users or regular visitors arriving later.",
        "试行期间，晚饭后到馆的人增加了，不过单凭这些数字无法解释他们是新读者，还是把到访时间推迟的常客。"
      ],
      [
        "A short interview at the entrance helped the committee distinguish between those two groups without asking people for unnecessary personal details.",
        "入口处的简短访谈帮助委员会区分了这两组人，同时没有索取不必要的个人信息。"
      ],
      [
        "The resulting report supported keeping one late evening each week, provided that the extra cost could be met within the existing budget.",
        "据此形成的报告支持每周保留一个晚间开放日，前提是现有预算能够承担额外开支。"
      ],
      [
        "Its conclusion was persuasive because it connected a limited recommendation to relevant observations instead of promising that every resident would benefit.",
        "这个结论有说服力，因为它把有限的建议与相关观察相联系，而没有承诺每个居民都会受益。"
      ]
    ],
    "questions": [
      {
        "prompt": "哪一句最接近委员会最初的主张？",
        "options": [
          "Every visitor must sign a petition.",
          "The library should test later opening hours.",
          "Staffing costs are irrelevant.",
          "No one visits after dinner."
        ],
        "answer": 1,
        "explanation": "首句主张先试行延长开放时间，而不是直接断定应永久全面延长。"
      },
      {
        "prompt": "为什么晚间到馆数字本身还不够？",
        "options": [
          "它无法单独区分新增读者与改时间的常客。",
          "它能证明每个居民都受益。",
          "它已经包含所有访谈答案。",
          "它说明图书馆没有额外成本。"
        ],
        "answer": 0,
        "explanation": "第三句明确指出两种来源都可能让晚间人数增加，需要进一步区分。"
      },
      {
        "prompt": "provided that 在建议中引出什么？",
        "options": [
          "与预算无关的时间顺序",
          "已经被排除的反例",
          "保留晚间开放所需满足的条件",
          "所有居民的直接引语"
        ],
        "answer": 2,
        "explanation": "provided that 意为‘只要、前提是’，这里限定额外成本必须在预算内。"
      }
    ]
  },
  {
    "title": "What a Small Survey Can Say",
    "zh": "给结论画出合理边界",
    "focus": "限定语与证据适用范围",
    "tip": "some、among those surveyed、in this trial 等限定语让结论与证据范围匹配。Most respondents preferred tea 只描述答卷者，不能擅自扩大成 Most residents prefer tea。样本少不代表观察毫无价值，而是需要谨慎推广。",
    "writing": "为一个兴趣小组设计三道调查题，并写两句结果描述；用限定语说明调查对象和不能据此判断的事情。",
    "items": [
      [
        "A neighbourhood café asked twenty regular customers whether they would welcome a quieter corner for reading, and most of them said that they would.",
        "一家社区咖啡馆询问二十位常客是否欢迎设置一个更安静的阅读角，大多数人表示欢迎。"
      ],
      [
        "The owner was pleased, but she recognised that regular customers were easier to reach than people who rarely entered the café.",
        "店主很高兴，但她意识到，常客比那些很少进店的人更容易被调查到。"
      ],
      [
        "Her notice therefore said that most respondents favoured the idea, rather than claiming that the entire neighbourhood wanted a reading corner.",
        "因此，她的告示写的是多数答卷者支持这个想法，而没有声称整个社区都想要一个阅读角。"
      ],
      [
        "She also invited comments from visitors who preferred conversation, since a useful change should consider needs that the original survey might have missed.",
        "她还邀请更喜欢交谈的访客提出意见，因为有用的改变也应考虑原调查可能遗漏的需求。"
      ],
      [
        "For a fortnight, one small table was set aside, and its use was observed at different times rather than only during the quietest hour.",
        "在两周里，店里划出一张小桌子，并在不同时间观察使用情况，而不只观察最安静的时段。"
      ],
      [
        "The experiment offered a modest basis for another decision, while leaving open the possibility that the arrangement would need to change.",
        "这个试验为下一步决定提供了有限依据，同时保留了调整安排的可能。"
      ]
    ],
    "questions": [
      {
        "prompt": "哪一个说法最忠实于调查范围？",
        "options": [
          "Everyone in town needs silence.",
          "All cafés should stop conversation.",
          "No visitor prefers conversation.",
          "Most of the twenty regular customers surveyed welcomed the idea."
        ],
        "answer": 3,
        "explanation": "问卷对象只是被询问的二十位常客，不能扩大成全体居民或所有咖啡馆。"
      },
      {
        "prompt": "might have missed 表达什么？",
        "options": [
          "原调查必然已经覆盖所有需求。",
          "原调查可能遗漏过某些需求。",
          "未来肯定不会有新需求。",
          "店主故意拒绝全部意见。"
        ],
        "answer": 1,
        "explanation": "might have + 过去分词表示对过去情况的可能性判断，语气保留不确定性。"
      },
      {
        "prompt": "为什么要在不同时间观察？",
        "options": [
          "避免只凭一个安静时段概括整体使用情况。",
          "证明二十位常客永远不会改变想法。",
          "代替所有访客发表意见。",
          "保证阅读角一定永久成功。"
        ],
        "answer": 0,
        "explanation": "第五句把不同时间与单一时段对比，目的是获得范围更全面的观察。"
      }
    ]
  },
  {
    "title": "A Light Behind the Glass",
    "zh": "把观察、推测和确定分开",
    "focus": "情态表达与判断语气",
    "tip": "may/might 表示可能，must have done 表示基于线索对过去作强推断，并非亲眼所见。The light was on 是观察；Someone might have stayed late 是推测。报告里先写可确认的事实，再说明推断及其他解释。",
    "writing": "描写一个让你产生猜想的日常场景，分别写两条观察、两种可能解释和一个可核实的方法。",
    "items": [
      [
        "When the caretaker passed the exhibition room at nine, he noticed a light behind the glass even though the last visitor had left an hour earlier.",
        "管理员九点经过展厅时发现玻璃后面还亮着灯，尽管最后一位访客一小时前已经离开。"
      ],
      [
        "A colleague suggested that an artist might have stayed to adjust a display, but neither of them had actually seen anyone inside.",
        "一位同事猜测可能有艺术家留下调整展品，但两人实际上都没有看到里面有人。"
      ],
      [
        "The caretaker resisted the temptation to report this possibility as a fact and checked the room's booking record instead.",
        "管理员没有把这种可能当作事实报告，而是先查看了房间的预约记录。"
      ],
      [
        "The record showed no late appointment, which made the first explanation less likely without proving that it was impossible.",
        "记录显示没有晚间预约，这让第一种解释的可能性降低了，但并没有证明它不可能。"
      ],
      [
        "He then discovered that a timer had been reset during maintenance, so the light could turn on automatically after the building closed.",
        "随后他发现，维护期间一个定时器被重新设置了，因此大楼关闭后灯也可能自动亮起。"
      ],
      [
        "His final note distinguished what he had observed from what he had initially suspected, allowing the next caretaker to understand both the event and the correction.",
        "他在最终记录中区分了实际观察与最初怀疑，使下一位管理员能理解事情经过和后来的更正。"
      ]
    ],
    "questions": [
      {
        "prompt": "哪一项是故事中直接观察到的事实？",
        "options": [
          "An artist was definitely inside.",
          "The exhibition had been cancelled.",
          "A light was visible behind the glass.",
          "The timer had never been changed."
        ],
        "answer": 2,
        "explanation": "第一句直接描述管理员看到了灯光；艺术家留下只是同事提出的推测。"
      },
      {
        "prompt": "might have stayed 表示什么？",
        "options": [
          "对过去可能发生之事的推测",
          "对未来一定发生之事的承诺",
          "管理员亲眼证实的动作",
          "艺术家每天的固定习惯"
        ],
        "answer": 0,
        "explanation": "might have stayed 是情态动词加完成式，表示可能曾经留下，并未断言事实。"
      },
      {
        "prompt": "哪句话准确概括预约记录的作用？",
        "options": [
          "It ruled out every possible explanation.",
          "It made one explanation less likely.",
          "It proved the colleague was dishonest.",
          "It confirmed a late appointment."
        ],
        "answer": 1,
        "explanation": "第四句只说第一种解释变得较不可能，没有预约并不足以排除所有可能。"
      }
    ]
  },
  {
    "title": "A Form Worth Reading",
    "zh": "从抽象名词回到具体行动",
    "focus": "抽象名词与名词化表达",
    "tip": "名词化能压缩信息，如 the collection of data 对应 collect data；但连续堆叠会隐藏‘谁做什么’。读长名词短语时，先找中心名词，再把 of、by 等引出的部分还原成动作与参与者。",
    "writing": "选一段你见过的正式通知，找出两个抽象名词，把它们改写成明确说明‘谁做什么’的句子。",
    "items": [
      [
        "The club's membership form promised the careful management of information, yet several new members could not tell what that promise required anyone to do.",
        "俱乐部入会表承诺谨慎管理信息，但几位新成员看不出这项承诺具体要求谁做什么。"
      ],
      [
        "Its secretary realised that reassuring abstract nouns could sound impressive while leaving the practical responsibilities unclear.",
        "秘书意识到，令人安心的抽象名词可能听起来很有分量，却没有说明实际责任。"
      ],
      [
        "She replaced the phrase about data collection with a sentence explaining which contact details the club requested and why it requested them.",
        "她把有关数据收集的短语改成了一个句子，说明俱乐部索取哪些联系方式及其原因。"
      ],
      [
        "Another sentence identified the two volunteers who could view the list and described how a member could ask for an outdated entry to be corrected.",
        "另一个句子明确指出哪两位志愿者可以查看名单，并说明成员如何申请更正过期信息。"
      ],
      [
        "The revision did not make responsibility disappear; on the contrary, it made responsibility easier to locate in ordinary actions.",
        "修改并没有让责任消失；相反，它让人更容易在普通行动中找到责任。"
      ],
      [
        "When members understood the process, the club had less need to rely on the vague suggestion that professionalism alone would produce trust.",
        "当成员理解流程后，俱乐部就不必那么依赖‘仅凭专业性就会产生信任’这种含糊暗示。"
      ]
    ],
    "questions": [
      {
        "prompt": "the collection of data 最接近哪一个动作表达？",
        "options": [
          "collect data",
          "collectors disappear",
          "data collect people",
          "correct every sentence"
        ],
        "answer": 0,
        "explanation": "collection 是 collect 的名词形式，这里的名词短语可还原为收集数据这一动作。"
      },
      {
        "prompt": "修改后的表格增加了哪种清晰度？",
        "options": [
          "用更多抽象名词隐藏流程。",
          "取消成员更正信息的方式。",
          "只说专业性而不写责任人。",
          "明确谁能查看名单，以及如何更正信息。"
        ],
        "answer": 3,
        "explanation": "第四句明确补上可查看名单的人及申请更正的办法，使责任和动作更具体。"
      },
      {
        "prompt": "on the contrary 在第五句中起什么作用？",
        "options": [
          "列出两个相同日期",
          "纠正前面可能产生的错误理解",
          "表示两个动作同时开始",
          "引用一位成员的原话"
        ],
        "answer": 1,
        "explanation": "作者先否定责任消失，再用 on the contrary 说明相反结果：责任更易辨认。"
      }
    ]
  },
  {
    "title": "The Sentence on the Noticeboard",
    "zh": "给长句找到主干",
    "focus": "关系从句、插入信息与句子主干",
    "tip": "拆长句时先找主句主语和谓语，再给修饰部分划边界。The garden, which volunteers restored, will reopen 的主干是 The garden will reopen；which 从句补充花园的情况。去掉补充部分后，主句仍应完整。",
    "writing": "写一句包含关系从句的社区通知，再把它拆成三句短句。检查两种写法是否保留了相同信息。",
    "items": [
      [
        "The garden, which local volunteers had restored after the storm and which several nearby schools hoped to visit, would reopen on Saturday if the final inspection was completed.",
        "这座花园由当地志愿者在风暴后修复，附近几所学校也希望前来参观；如果最终检查完成，它将于周六重新开放。"
      ],
      [
        "Reading this notice aloud, Tomas found that he had reached the end without remembering exactly what would happen on Saturday.",
        "托马斯大声读完这份通知后，发现自己已经读到结尾，却记不清周六究竟会发生什么。"
      ],
      [
        "He first identified the main subject and verb, leaving the details about restoration and school visits to one side.",
        "他先找出了主句主语和谓语，把有关修复和学校参观的细节暂时放在一旁。"
      ],
      [
        "The central statement was simply that the garden would reopen, while the final clause supplied a condition rather than another promised event.",
        "核心陈述只是花园将重新开放，而最后一个从句给出的是条件，并不是另一个得到保证的事件。"
      ],
      [
        "Once he had separated these layers, he rewrote the notice as three shorter sentences and checked that none of the qualifications had been lost.",
        "区分这些层次后，他把通知改写成三个较短的句子，并检查限定条件是否都保留了。"
      ],
      [
        "The shorter version was easier to follow, not because the original ideas were simple, but because their relationships were now visible.",
        "较短的版本更易理解，不是因为原来的想法简单，而是因为它们之间的关系现在更清楚了。"
      ]
    ],
    "questions": [
      {
        "prompt": "第一句的主要陈述是什么？",
        "options": [
          "The schools had restored every garden.",
          "The garden would reopen.",
          "The storm would return on Saturday.",
          "The inspection had already failed."
        ],
        "answer": 1,
        "explanation": "主语是 The garden，主要谓语为 would reopen；关系从句补充花园背景。"
      },
      {
        "prompt": "if the final inspection was completed 表达什么？",
        "options": [
          "开放必须满足的条件",
          "已经确定取消的参观",
          "风暴造成的直接引语",
          "与开放无关的定语"
        ],
        "answer": 0,
        "explanation": "if 引出的条件限制了开放安排，因此不能在改写时删掉这个条件。"
      },
      {
        "prompt": "哪种简化会改变原意？",
        "options": [
          "把志愿者修复花园的信息另写一句。",
          "把学校希望参观的信息另写一句。",
          "把主句主语与谓语放在一起。",
          "删掉检查条件并写成必定周六开放。"
        ],
        "answer": 3,
        "explanation": "删去条件会把有前提的安排变成无条件承诺，改变原句的确定程度。"
      }
    ]
  },
  {
    "title": "Two Numbers Rising Together",
    "zh": "相关变化不等于因果",
    "focus": "因果关系与替代解释",
    "tip": "because 引出原因，但两个数字同时变化本身不能证明其中一个导致另一个。论证因果时，要问是否存在共同原因、时间先后和其他解释。may explain 比 proves 更适合尚未排除替代原因的情况。",
    "writing": "举一个两件事一起增加却未必互为因果的例子，提出一个共同原因，并说明还需要什么证据。",
    "items": [
      [
        "The sports club noticed that sales of cold drinks and use of the outdoor courts had both increased during the same month.",
        "运动俱乐部注意到，同一个月里冷饮销量和室外球场使用量都增加了。"
      ],
      [
        "One member jokingly suggested that selling more drinks must have persuaded more people to play, but the manager asked what else had changed.",
        "一位成员开玩笑说，卖出更多饮料一定吸引了更多人打球，但经理问还有什么发生了变化。"
      ],
      [
        "Warmer evenings offered a plausible shared explanation: they could encourage longer games while also making the players thirstier.",
        "更温暖的傍晚提供了一个合理的共同解释：它既可能让人打球更久，也可能使球员更口渴。"
      ],
      [
        "A local tournament might also have attracted additional visitors, so the club compared ordinary evenings with tournament evenings before drawing a conclusion.",
        "当地一场赛事也可能吸引额外访客，因此俱乐部在下结论前比较了普通晚间和比赛晚间的情况。"
      ],
      [
        "Even that comparison was imperfect, because the groups and weather conditions were not identical on every occasion.",
        "即便这样的比较也不完美，因为每次的人群和天气条件并不完全相同。"
      ],
      [
        "The report consequently described several possible influences and avoided turning an interesting association into a claim that the evidence could not support.",
        "因此，报告描述了几种可能的影响因素，没有把一个有趣的关联变成证据无法支持的因果主张。"
      ]
    ],
    "questions": [
      {
        "prompt": "哪一项是两组数字的可能共同原因？",
        "options": [
          "饮料销量必然决定每人的运动能力。",
          "经理取消了所有比赛。",
          "傍晚天气变暖。",
          "所有访客都不再口渴。"
        ],
        "answer": 2,
        "explanation": "第三句说明温暖天气可能同时增加运动时间与饮水需求，构成共同解释。"
      },
      {
        "prompt": "为什么比较普通晚间与比赛晚间？",
        "options": [
          "证明天气在每次观察中完全一样。",
          "考察赛事带来额外访客这一替代解释。",
          "确认饮料一定导致人们运动。",
          "避免记录任何实际数字。"
        ],
        "answer": 1,
        "explanation": "第四句把赛事视为另一个潜在影响因素，比较是为了进一步了解它的作用。"
      },
      {
        "prompt": "哪一句保留了证据所需的谨慎程度？",
        "options": [
          "Warmer evenings may explain part of the increase.",
          "Drink sales prove that sport causes summer.",
          "Every association must be a direct cause.",
          "The comparison removed every uncertainty."
        ],
        "answer": 0,
        "explanation": "may 与 part of 承认解释的可能性及范围，与仍存在其他因素的情况相符。"
      }
    ]
  },
  {
    "title": "Room Beside the Entrance",
    "zh": "回应反对意见而不回避问题",
    "focus": "让步、反驳与方案修正",
    "tip": "Although 或 admittedly 可以承认对方的合理部分；however 引出自己的限制或回应。有效回应要针对对方实际提出的问题，例如承认入口空间有限，再调整停车位置，而不是改成攻击对方。",
    "writing": "提出一个改进学习空间的方案，写一条合理反对意见，再用让步句回应，并给出可操作的调整。",
    "items": [
      [
        "A proposal to install bicycle stands outside the community centre attracted support from riders who were tired of leaving their bicycles against a fence.",
        "在社区中心外安装自行车架的提议得到骑行者支持，他们早已不想再把车靠在围栏上。"
      ],
      [
        "However, a neighbour pointed out that the suggested position would narrow the route used by people entering with wheelchairs or pushchairs.",
        "不过，一位邻居指出，建议的位置会缩窄轮椅和婴儿车使用者的入口通道。"
      ],
      [
        "Instead of dismissing this concern as opposition to cycling, the organisers accepted that convenient parking should not make the entrance harder to use.",
        "组织者没有把这种担忧斥为反对骑行，而是承认方便停车不应让入口变得难以使用。"
      ],
      [
        "Although the side wall was slightly farther from the door, it offered enough room for the stands without reducing the clear passage beside the entrance.",
        "虽然侧墙离门稍远一些，但那里有足够空间放置车架，又不缩窄入口旁的通道。"
      ],
      [
        "The revised plan retained the purpose of the original proposal while responding directly to the strongest practical objection.",
        "修订方案保留了原提议的目标，同时直接回应了最有力的实际反对理由。"
      ],
      [
        "Agreement became possible when the discussion shifted from deciding which group mattered more to finding an arrangement that respected both needs.",
        "当讨论从决定哪个群体更重要转向寻找兼顾两种需求的安排时，达成一致才成为可能。"
      ]
    ],
    "questions": [
      {
        "prompt": "邻居反对的是哪一点？",
        "options": [
          "社区内不应有人骑自行车。",
          "车架永远不能靠墙放置。",
          "所有骑行者都应离开社区。",
          "原定位置会缩窄入口通道。"
        ],
        "answer": 3,
        "explanation": "第二句提出的是入口通行空间问题，并非反对骑行或否定全部停车设施。"
      },
      {
        "prompt": "Although the side wall was slightly farther... 承认了什么？",
        "options": [
          "新位置略远，但仍有实际优点。",
          "侧墙根本没有足够空间。",
          "新的方案已经完全失去目的。",
          "入口必须为了停车而关闭。"
        ],
        "answer": 0,
        "explanation": "although 引出距离上的小不足，主句说明空间和通道方面的优势。"
      },
      {
        "prompt": "为什么新方案构成有效回应？",
        "options": [
          "它把邻居的担心换成了另一个无关话题。",
          "它拒绝说明车架的具体位置。",
          "它保留停车目标并解决被指出的通行问题。",
          "它只重复原方案而没有任何改变。"
        ],
        "answer": 2,
        "explanation": "第五句强调既保留目标又直接回应实际异议，这比回避或攻击对方更有效。"
      }
    ]
  },
  {
    "title": "A Report in Fewer Words",
    "zh": "摘要保留主张和限制",
    "focus": "概括、改写与信息层级",
    "tip": "摘要不是把每段首句拼起来。先辨认目的、主要发现和限制，再用自己的话压缩。原文 says a trial may help，摘要不能升级成 proves it always works；例子可以省略，但会改变结论范围的条件应保留。",
    "writing": "用三句英文概括本课：第一句写试验目的，第二句写发现，第三句保留限制；不要加入原文没有的建议。",
    "items": [
      [
        "A residents' association produced a long report about a trial in which several volunteers planted containers on the roof of their meeting hall.",
        "一个居民协会写了一份长报告，介绍几位志愿者在会堂屋顶放置种植容器的试验。"
      ],
      [
        "The report described how the group chose the plants, shared the watering duties and recorded observations over one summer.",
        "报告描述了小组选植物、分担浇水任务，以及在一个夏季记录观察结果的过程。"
      ],
      [
        "Participants enjoyed using the space, but the report did not claim that this small project established the benefits or costs of every kind of roof garden.",
        "参与者喜欢使用这个空间，但报告并未声称这个小项目证实了所有类型屋顶花园的收益或成本。"
      ],
      [
        "Asked to summarise the findings for a newsletter, Priya removed the list of tools while keeping the trial's limited scale and the need for further observation.",
        "普里娅受邀为通讯概括结果时，删去了工具清单，却保留了试验规模有限和需要继续观察这两点。"
      ],
      [
        "She also checked that her shorter sentences did not convert the volunteers' positive experience into a universal recommendation for other buildings.",
        "她还检查了自己的短句，确保没有把志愿者的积极体验变成适用于其他建筑的普遍建议。"
      ],
      [
        "Her summary was useful because it reduced detail without increasing certainty, allowing readers to understand both what the project suggested and what remained unknown.",
        "她的摘要很有用，因为它减少细节却没有增加确定性，让读者既明白项目提示了什么，也明白哪些事情仍然未知。"
      ]
    ],
    "questions": [
      {
        "prompt": "哪项信息适合在短摘要中优先保留？",
        "options": [
          "每件工具的完整品牌清单。",
          "志愿者体验积极，但试验规模与时间有限。",
          "所有建筑都已经适合屋顶种植。",
          "报告没有进行任何观察。"
        ],
        "answer": 1,
        "explanation": "积极体验与试验限制共同决定结论的含义，工具细节并非摘要的核心。"
      },
      {
        "prompt": "哪个改写无依据地增加了确定性？",
        "options": [
          "Volunteers enjoyed the space during the trial.",
          "The project involved one hall and one summer.",
          "Further observation was still needed.",
          "The trial proved that every building needs a roof garden."
        ],
        "answer": 3,
        "explanation": "原文明确没有推广到每种屋顶花园；proved 与 every 把有限观察变成普遍断言。"
      },
      {
        "prompt": "reduced detail without increasing certainty 最接近什么？",
        "options": [
          "删除所有限制，只留下结论。",
          "添加没有观察过的结果。",
          "压缩次要信息，同时保留原结论的谨慎程度。",
          "逐字复制报告中的每一个句子。"
        ],
        "answer": 2,
        "explanation": "最后一句说明好摘要减少细节，但不能夸大原文证据所支持的确定程度。"
      }
    ]
  }
],
];

const titles = ["First Things First", "Practice and Progress", "Developing Skills", "Fluency in English"];
const levels = ["A1", "A2", "B1", "B2"];
const colors = ["#477e84", "#ab5e56", "#7276a5", "#947443"];

export const textbookUnits = volumes.flatMap((units, bookIndex) => units.map((unit, chapter) => ({
  ...unit,
  title: unit.zh,
  englishTitle: unit.title,
  id: `nce-b${bookIndex + 1}-u${String(chapter + 1).padStart(2, "0")}`,
  book: bookIndex + 1,
  chapter,
})));

export const textbookBooks = volumes.map((units, bookIndex) => ({
  id: `path-nce-${bookIndex + 1}`,
  title: `新概念第${bookIndex + 1}册 · 原创配套`,
  zh: `新概念第${bookIndex + 1}册 · 原创配套`,
  author: "English Studio",
  level: levels[bookIndex],
  genre: "配套自学",
  collection: "textbook",
  color: colors[bookIndex],
  symbol: "Aa",
  course: bookIndex + 1,
  description: `为 ${titles[bookIndex]} 自学者编写的本站原创配套路径，含8个连贯短篇、学习目标、讲解与练习；建议难度 ${levels[bookIndex]}，并非官方分级。不是原版教材课文、译文、目录或音频。原版教材可另行导入本机。`,
  chapters: units.map((unit, chapter) => ({
    title: unit.title,
    zh: `原创单元 ${chapter + 1} · ${unit.zh}`,
    lines: unit.items.map(([en, zh], index) => [en, zh, null, index === 0]),
  })),
}));
