import { getDb } from "../api/queries/connection";
import { upsertUser } from "../api/queries/users";
import { hashPassword } from "../api/lib/password";
import * as schema from "./schema";

/**
 * 解忧杂货店种子数据：
 * - 12 件商品（信纸文具/厨房日杂/治愈小物，各配"店主手记"）
 * - 6 条经典语录（标注章节出处）
 * - 5 篇示例信件（月兔/克郎/浩介/晴美/绿河型，原创改写，不照抄小说情节）
 * - 1 篇关于页文案
 * 幂等：重复执行前清空对应表（仅用于演示环境初始化）。
 */
async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  await db.delete(schema.contents);
  await db.delete(schema.products);

  // ---------- 商品 ----------
  await db.insert(schema.products).values([
    // 信纸文具
    {
      name: "牛奶箱信纸套装",
      category: "stationery",
      price: "36.00",
      stock: 50,
      imageUrl: "/prod-stationery.png",
      description:
        "和纸信纸十张、牛皮信封五枚、朱红封蜡一颗。写给未来的自己，或写给某个想道谢的人。纸质微黄，落笔不洇。",
      keeperNote: "店里的老规矩：写信的纸要用纸包好再交到你手上。",
    },
    {
      name: "浪矢钢笔·木杆",
      category: "stationery",
      price: "68.00",
      stock: 30,
      imageUrl: "/prod-stationery.png",
      description:
        "复古木杆钢笔，配蓝黑墨水。笔尖软硬适中，适合慢慢写一封长信。附手写体练字帖一页。",
      keeperNote: "字写得慢没关系，想清楚了再落笔，信也是，人生也是。",
    },
    {
      name: "牛皮纸信封·十枚组",
      category: "stationery",
      price: "12.00",
      stock: 100,
      imageUrl: "/product-placeholder.png",
      description:
        "加厚牛皮纸信封十枚，封口带细麻绳。右下角可盖邮戳章，附赠空白标签贴纸。",
      keeperNote: "卷帘门的投递口瘦长瘦长的，这个尺寸刚好投得进去。",
    },
    {
      name: "空白明信片·街景系列",
      category: "stationery",
      price: "18.00",
      stock: 80,
      imageUrl: "/prod-stationery.png",
      description:
        "八张一套的手绘明信片：上坡小街、老招牌、黄昏的商店街。背面留白，等你想好要写什么。",
      keeperNote: "有些话说不出口，写在卡片背面就刚刚好。",
    },
    // 厨房日杂
    {
      name: "搪瓷牛奶锅·小号",
      category: "kitchen",
      price: "58.00",
      stock: 25,
      imageUrl: "/prod-kitchen.png",
      description:
        "奶白搪瓷小锅，热一瓶牛奶刚刚好。木柄不烫手，可直接上桌。睡前热牛奶的仪式感。",
      keeperNote: "牛奶箱旁边，总得有一锅热牛奶才算完整。",
    },
    {
      name: "粗陶饭碗·暖棕",
      category: "kitchen",
      price: "32.00",
      stock: 40,
      imageUrl: "/prod-kitchen.png",
      description:
        "手作粗陶碗，暖棕色釉面，捧在手里有一点分量。一人食也要好好吃饭。",
      keeperNote: "烦恼再多，饭要趁热吃。",
    },
    {
      name: "木柄厨房巾·三条装",
      category: "kitchen",
      price: "22.00",
      stock: 60,
      imageUrl: "/prod-kitchen.png",
      description:
        "棉麻厨房巾三条，格纹与素色各一。吸水快，越洗越软。昭和老厨房的样子。",
      keeperNote: "店里的货架上，厨房用品一直是卖得最好的。",
    },
    {
      name: "黄铜小烛台",
      category: "kitchen",
      price: "45.00",
      stock: 20,
      imageUrl: "/prod-kitchen.png",
      description:
        "黄铜迷你烛台，附蜡烛两支。夜里写信时点在桌角，光正好落在信纸上。",
      keeperNote: "蜡烛的光比台灯慢，适合想事情。",
    },
    // 治愈小物
    {
      name: "木雕小狗·掌心尺寸",
      category: "healing",
      price: "49.00",
      stock: 15,
      imageUrl: "/prod-healing.png",
      description:
        "手工木雕小狗摆件，掌心大小，木纹清晰。据说是照着一位老客人的手艺做的。",
      keeperNote: "每个迷过路的人，都值得被一只小狗等着回家。",
    },
    {
      name: "迷你口风琴",
      category: "healing",
      price: "88.00",
      stock: 10,
      imageUrl: "/prod-healing.png",
      description:
        "十孔迷你口风琴，音色清亮。附一张手写简谱——那首叫《重生》的曲子。",
      keeperNote: "有些旋律会被唱下去，比人走得更远。",
    },
    {
      name: "玻璃牛奶瓶·复古",
      category: "healing",
      price: "19.00",
      stock: 70,
      imageUrl: "/prod-healing.png",
      description:
        "老式玻璃牛奶瓶，带纸盖。可以插花，也可以只是摆在窗台上装一点阳光。",
      keeperNote: "以前的牛奶都装在玻璃瓶里，喝完要把瓶子还回去。",
    },
    {
      name: "解忧礼盒·信纸+小物",
      category: "healing",
      price: "99.00",
      stock: 12,
      imageUrl: "/product-placeholder.png",
      description:
        "信纸套装 + 木雕小狗 + 迷你牛奶瓶，牛皮纸盒装，附一张空白解忧卡片。适合送给正在烦恼的朋友。",
      keeperNote: "把这家店告诉一个需要的人，就是最好的礼物。",
    },
  ]);

  // ---------- 语录 ----------
  await db.insert(schema.contents).values([
    {
      type: "quote",
      title: "quote-1",
      body: "人的心声是绝对不能无视的。",
      sourceNote: "第一章·回答在牛奶箱里",
      sort: 1,
    },
    {
      type: "quote",
      title: "quote-2",
      body: "无论现在多么不开心，你要相信，明天会比今天更好。",
      sourceNote: "第二章·深夜的口琴声",
      sort: 2,
    },
    {
      type: "quote",
      title: "quote-3",
      body: "其实所有纠结做选择的人，心里早就有了答案。",
      sourceNote: "第五章·来自天上的祈祷",
      sort: 3,
    },
    {
      type: "quote",
      title: "quote-4",
      body: "你的地图是一张白纸，才可以随心所欲地描绘地图。一切全在你自己。",
      sourceNote: "第五章·来自天上的祈祷",
      sort: 4,
    },
    {
      type: "quote",
      title: "quote-5",
      body: "如果自己不想积极认真地生活，不管得到什么样的回答都没用。",
      sourceNote: "第五章·来自天上的祈祷",
      sort: 5,
    },
    {
      type: "quote",
      title: "quote-6",
      body: "人与人之间，往往是由微小却长存的善意连接在一起的。",
      sourceNote: "全书主题",
      sort: 6,
    },
  ]);

  // ---------- 示例信件（原创改写，化名故事） ----------
  await db.insert(schema.contents).values([
    {
      type: "story",
      title: "月兔型 · 爱情",
      body: JSON.stringify({
        penName: "窗台的兔子",
        category: "love",
        letter:
          "浪矢爷爷：\n\n我喜欢的人要去很远的城市治病，至少一年。教练说，只要我留下集训，今年就能进省队——那是我练了八年的目标。我每天都在想，是陪他走，还是留下。想得头疼，还是决定不了。请您告诉我，哪条路是对的？",
        reply:
          "窗台的兔子：\n\n你的信我看了三遍。恕我直言，你心里其实早有答案，只是需要有人替你确认。\n\n我想问你一个问题：如果他去治病前对你说「我希望你站在赛场上」，你会怎么选？真正在意你的人，往往希望看到你成为你想成为的样子。陪伴有许多种方式，不一定都要站在原地。\n\n无论选哪条路，都不要选「后悔」这条路。\n\n——浪矢杂货店",
      }),
      sourceNote: "化名故事 · 爱情",
      sort: 1,
    },
    {
      type: "story",
      title: "克郎型 · 梦想",
      body: JSON.stringify({
        penName: "街角吉他手",
        category: "dream",
        letter:
          "店主：\n\n我在城里唱了三年，livehouse 的观众从来没有超过二十个人。家里打来电话，说父亲的店需要人接手。我该继续唱下去，还是回家？继续唱，怕十年后还是二十个观众；回家，又怕这辈子就这样了。",
        reply:
          "街角吉他手：\n\n先告诉你一件事：你的歌能被二十个人听见，就说明它值得被唱出来。二十个人里，也许就有一个人会一直记得它。\n\n梦想和现实不是非此即彼的敌人。回家看店不代表放弃音乐，继续唱也不代表不顾家人。真正的问题是：十年后回头看，哪一种「怕」你更承受得起？\n\n想清楚了，就大胆去走。你的音乐，一定会以某种方式留下来。\n\n——浪矢杂货店",
      }),
      sourceNote: "化名故事 · 梦想",
      sort: 2,
    },
    {
      type: "story",
      title: "浩介型 · 家庭",
      body: JSON.stringify({
        penName: "听旧唱片的人",
        category: "family",
        letter:
          "浪矢杂货店：\n\n爸妈的生意出了很大的问题，家里每天都很吵。昨天我听见他们说，要「离开这里重新开始」。我才十五岁，我不知道该不该跟他们走，也不知道走了以后我还是谁。",
        reply:
          "听旧唱片的人：\n\n十五岁就要想这些，真是难为你了。\n\n家不只是房子和街道，家是人。只要一家人还想在一起，搬到哪里都还是家。但如果有一天你发现彼此的方向不同了，也不必用「走散」来惩罚自己——家人之间最深的牵绊，是希望对方过得好。\n\n你现在能做的，是好好吃饭，好好念书。其他的，让大人先扛一扛。\n\n——浪矢杂货店",
      }),
      sourceNote: "化名故事 · 家庭",
      sort: 3,
    },
    {
      type: "story",
      title: "晴美型 · 事业",
      body: JSON.stringify({
        penName: "值夜班的灯",
        category: "career",
        letter:
          "店主：\n\n我白天上班，晚上还打一份工。很多人背后说我「太拼了」「一个女孩子何必」。可是我想快点攒够钱，让我在乎的人过上好日子，也想有一家自己的小店。是我太贪心了吗？",
        reply:
          "值夜班的灯：\n\n想让自己在乎的人过得好，这不是贪心，这是温柔。\n\n别人说什么并不重要——他们没有走过你走的路，也没有点过你夜里那盏灯。只是提醒你一句：赚钱是长跑，别在最开始就把力气用光。学一点东西，留一点时间给身体，你的路还很长。\n\n我相信，你的店会开起来的。到时候记得写信告诉我地址。\n\n——浪矢杂货店",
      }),
      sourceNote: "化名故事 · 事业",
      sort: 4,
    },
    {
      type: "story",
      title: "绿河型 · 人生方向",
      body: JSON.stringify({
        penName: "河边的背包客",
        category: "life",
        letter:
          "浪矢爷爷：\n\n我站在人生的岔路口：一份安稳但不喜欢的工作，和一条完全陌生、谁都说不准的路。所有人都劝我选安稳。可是每次想到「就这样过一辈子」，我就觉得透不过气。我该怎么办？",
        reply:
          "河边的背包客：\n\n「所有人都劝你」——这句话里有答案的一半：你的烦恼不是不知道选什么，而是你选的那个，没人替你点头。\n\n那么我来替你点个头吧：想走的那条路，就去走。走错了可以回来，没走过才会想一辈子。人生这张地图，本来就是要一边走一边画的。\n\n一路顺风。到了新的地方，记得来信。\n\n——浪矢杂货店",
      }),
      sourceNote: "化名故事 · 人生方向",
      sort: 5,
    },
  ]);

  // ---------- 关于页 ----------
  await db.insert(schema.contents).values({
    type: "about",
    title: "浪矢杂货店的故事",
    body: `在一条上坡小街的尽头，有一家老旧的杂货店。招牌上的字已经黯淡发黑，店里卖些文具、厨房用品和日杂，生意清淡，却一直开着。

很多年前，因为店名「浪矢」与「烦恼」读音相近，附近的孩子们开始把烦恼写在纸上，半开玩笑地投进店里。店主是一位认真的老人，他决定：每一封信都要认真回答。

后来，规矩慢慢定了下来——晚上把信投进卷帘门的投递口，第二天早上，回信就会放在店后的牛奶箱里。为了这个约定，老人每天五点半就起床。

有人问老人，你的回答真的有用吗？老人说：「来咨询的人，心里其实已经有了答案。我的回答之所以发挥作用，是因为他们自己很努力。」

如今这家店开到了网上。货架上依然是寥寥的商品，但每一件都用纸包好了；信箱也依然开着——无论你挣扎犹豫，还是绝望痛苦，都欢迎来信。

人的心声，是绝对不能无视的。`,
    sourceNote: "关于本店",
    sort: 1,
  });

  // ---------- 店主管理员账号（本地登录） ----------
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  await upsertUser({
    unionId: "admin",
    name: "店主",
    passwordHash: await hashPassword(adminPassword),
    role: "admin",
    lastSignInAt: new Date(),
  });
  console.log(`Admin seeded → username: admin / password: ${adminPassword}`);

  console.log("Done.");
  process.exit(0);
}

seed();
