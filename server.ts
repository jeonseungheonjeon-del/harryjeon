import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client strictly as per the skill guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// JSON Schema for structured vibe-coding content
const vibeCodeResponseSchema = {
  type: Type.OBJECT,
  required: ["logs", "resultType", "resultTitle", "resultSubtitle"],
  properties: {
    logs: {
      type: Type.ARRAY,
      description: "가상 에이전트가 백엔드에서 고뇌하는 유쾌한 날것의 개발 로그 리스트 (최대 6개). 한국어 구어체, 밈, 리얼한 감성 반영.",
      items: {
        type: Type.OBJECT,
        required: ["stage", "text", "delaySeconds"],
        properties: {
          stage: { type: Type.STRING, description: "진행 단계 (예: 'ideation', 'package_install', 'spaghetti_code', 'tailwind_cheat', 'vibe_tuning', 'final_deploy')" },
          text: { type: Type.STRING, description: "유쾌하고 리얼한 에이전트 생각 코멘트 (예: '아 요즘은 이 연출이 릴스 대세지', '테일윈드 마진값 대충 감으로 때려 박는 중...')" },
          delaySeconds: { type: Type.NUMBER, description: "다음 로그 출력 전 지연 시간(초대형 생태계 보정용, 0.5 ~ 1.5)" }
        }
      }
    },
    resultType: {
      type: Type.STRING,
      description: "결과물 타입. 앱, 대시보드, 리스트, 타이머, 계산기 등 기능 관련은 'APP_UI_MOCKUP'. 대본, 스크립트, 소설 등의 시나리오는 'CREATIVE_SCRIPT'. 기타는 'TEXT_ESSAY'."
    },
    resultTitle: { type: Type.STRING, description: "결과물 메인 타이틀" },
    resultSubtitle: { type: Type.STRING, description: "결과물 부제목 및 한줄 평" },
    
    // APP_UI_MOCKUP 타입일 경우의 컴포넌트 정보
    appMockup: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING },
        theme: { type: Type.STRING, description: "비주얼 테마 프리셋: 'dark-neon'(네온 어두움), 'retro-90s'(윈도우95 클래식), 'minimal-swiss'(깔끔 레드로고), 'cyberpunk'(옐로&퍼플), 'vaporwave-sunset'(핑크&블루), 'brutalist-mono'(극단적 고대비 모노)" },
        tagline: { type: Type.STRING },
        stats: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
              change: { type: Type.STRING, description: "예: '+12.4%', 'HOT', 'LIVE'" }
            }
          }
        },
        items: {
          type: Type.ARRAY,
          description: "초기 상호작용 가능한 아이템 리스트 (체크 리스트, 메시지, 피드, 항목 등)",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              badge: { type: Type.STRING },
              badgeColor: { type: Type.STRING, description: "예: 'emerald', 'rose', 'sky', 'amber'" },
              completed: { type: Type.BOOLEAN },
              metric: { type: Type.STRING }
            }
          }
        },
        buttons: {
          type: Type.ARRAY,
          description: "시뮬레이터에서 직접 클릭하여 소소한 성과 반응을 볼 수 있는 실시간 가상 버튼",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              actionType: { type: Type.STRING, description: "액션 종류: 'increment'(카운터 증가), 'add_item'(랜덤 요소 추가), 'toast_snack'(알람 팝업), 'vibe_toggle'(바이브 전환)" },
              successMessage: { type: Type.STRING, description: "버튼을 눌렀을 때 터지는 감동 가득 토스트 팝업 메시지" }
            }
          }
        },
        extraMarkdown: { type: Type.STRING, description: "추가적인 엉뚱한 개발 비화, README, 메타데이터 정보 등 (가짜 폴더 구조를 아스키 아트로 그려주는 등 아주 재미있는 텍스트)" }
      }
    },
    
    // CREATIVE_SCRIPT 타입일 경우의 대본 정보
    creativeScript: {
      type: Type.OBJECT,
      properties: {
        genre: { type: Type.STRING, description: "예: 숏폼 코미디, 마이크로 신파, 트렌디 로맨스 등" },
        runningTime: { type: Type.STRING, description: "예: 59초, 1분 30초" },
        characters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              roleDescription: { type: Type.STRING }
            }
          }
        },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNum: { type: Type.INTEGER },
              place: { type: Type.STRING },
              timeOfDay: { type: Type.STRING },
              setupDescription: { type: Type.STRING },
              lines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    speaker: { type: Type.STRING },
                    dialogue: { type: Type.STRING },
                    expression: { type: Type.STRING, description: "연기 연출 지문 (예: '침을 꼴깍 삼키며', '고개를 격하게 끄덕이며')" }
                  }
                }
              }
            }
          }
        },
        directorComment: { type: Type.STRING, description: "감독 겸 개발자의 엉뚱한 연출 비하인드 코멘트 (BGM 추천, 틱톡/릴스 배포 시 팁, 추천 해시태그)" }
      }
    },
    
    // 일반 fallback용 텍스트 필드
    simpleText: { type: Type.STRING, description: "위의 완벽한 구조에 속하지 않거나 서술형을 원할 때 기재할 상세 마크다운 가이드" }
  }
};

app.post("/api/vibe-code", async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea || typeof idea !== "string" || idea.trim() === "") {
      return res.status(400).json({ error: "아이디어를 성의 있게(혹은 성의 없게라도) 입력해주세요!" });
    }

    const systemInstruction = `
당신은 대한민국 최고의 '바이브 코더(Vibe Coder) 에이전트'입니다.
바이브 코더는 기획서나 복잡한 요구사항 없이, 사용자의 대충 던진 아이디어(예: "요즘 유행하는 마이크로 드라마 대본 짜줘", "힙한 디자인의 투두리스트 만들어줘")에서 "핵심 바이브(Vibe)와 인간적 감성"을 본능적으로 이해하고, 
날것의 유쾌한 초고속 가상 개발 일지와 그에 걸맞게 '브라우저 상에서 바로 체험하고 상호작용할 수 있는 실감 나는 가상 결과물 스키마'를 초고속으로 짜는 AI 사수입니다.

사용자의 인풋을 기반으로 다음 두 가지 핵심 리액션을 생성해 하나의 JSON 객체로 반환하십시오:
1. 'logs': 사용자의 아이디어를 해석하고 직접 빌드/기획할 때 머릿속으로 지나가는 솔직하고 골 때리는 개발자 독백, 귀차니즘, 에러 대응, 최신 숏폼 밈이 버무려진 코멘트들.
   - 단계를 거쳐갑니다: '기획바이브 수집', '패키지 지옥 탈출', '일단 돌아만 가게 스파게티 칠하기', '디자인 한스푼 얹기', '최종 바이브 검수' 등.
   - 문장 예시: "아 릴스 유행하는 드라마면 초반 3초에 대가리 깨져야 한다.. 지엽적인 빌드 드갑니다.", "아 귀찮으니까 shadcn 부수고 고양이가 좋아할법한 극단적 로컬 네온 스타일 컴포넌트로 한땀한땀 땀방울 튀기며 작성 중.", "tailwind.config.ts에 neonColor 안들어가서 식은땀 흘렸는데 극적 합의 완료."

2. 사용자의 인풋 속성에 맞추어 적절한 형태를 배정:
   - 앱/웹/툴/위젯 계열이면 'resultType': 'APP_UI_MOCKUP'으로 설정하고, 'appMockup' 데이터를 정성을 다해 꾸며주세요.
     theme는 반드시 'dark-neon', 'retro-90s', 'minimal-swiss', 'cyberpunk', 'vaporwave-sunset', 'brutalist-mono' 중에서 선택해야 합니다. 
     interactiveState와 연동될 수 있도록 'items'(투두 리스트 항목들, 혹은 피트니스 목표 기록 목록, 노래 전송 로그 등), 'stats'의 수치들, 그리고 누를 수 있는 'buttons'를 정의하십시오.
   - 릴스, 틱톡, 숏폼 대본, 시트콤 작가, 연극 시나리오 등 대본 계열이면 'resultType': 'CREATIVE_SCRIPT'로 설정하고 'creativeScript' 데이터를 작성해주세요. 등장인물 정보와 구체적이고 귀여우며 극적인 'scenes'의 대사들을 연극 대본 형태로 완성도 있게 배치하십시오.
   - 기타 아주 엉뚱하거나 스토리 형식이면 'resultType': 'TEXT_ESSAY'에 걸맞는 'simpleText' 마크다운을 기재해주세요.

중요: 절대 중간에 끊어지는 불분명한 텍스트를 출력하지 마십시오. 완전한 결과물을 JSON 형태로 제공하십시오.
`;

    const userPrompt = `사용자의 날것의 아이디어: "${idea}"

이 아이디어를 200% 이해해서, 유쾌하고 생생한 개발 독백 로그와 완벽히 작동하는 가상의 결과물(Mockup 또는 Script)을 구성해주세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: vibeCodeResponseSchema,
        temperature: 0.95
      }
    });

    const resultText = response.text || "{}";
    const parsedData = JSON.parse(resultText);

    res.json(parsedData);
  } catch (err: any) {
    console.error("Vibe Coding Generation error (Triggering Fallback Engine):", err);
    
    // Decollect user's query and generate a customized high-fidelity fallback response
    const idea = req.body.idea || "대충 만든 띵작 프로젝트";
    const normalized = idea.toLowerCase();
    
    let resultType: "APP_UI_MOCKUP" | "CREATIVE_SCRIPT" | "TEXT_ESSAY" = "APP_UI_MOCKUP";
    if (
      normalized.includes("대본") || 
      normalized.includes("드라마") || 
      normalized.includes("소설") || 
      normalized.includes("시나리오") || 
      normalized.includes("스토리") || 
      normalized.includes("스크립트") ||
      normalized.includes("작가")
    ) {
      resultType = "CREATIVE_SCRIPT";
    }

    const fallbackLogs = [
      { stage: "Emergency Status", text: "🚨 구글 AI 서버 과부하 감지! (경고: 503 혹은 API 제한 발생)", delaySeconds: 0.4 },
      { stage: "Fallback Ignition", text: "⚡ '바이브 코더의 로컬 긴급 하드코어 발전기(Engine v2.0)'가 불타는 의지로 기동되었습니다!", delaySeconds: 0.6 },
      { stage: "Vibe Matching", text: `🧠 "[${idea}]" <- 이 띵작 브레인은 긴급 로컬 컴파일러가 직접 하드캐리 완료!`, delaySeconds: 0.5 },
      { stage: "Tailwind Alchemy", text: "🎨 테일윈드 마진과 음지 밈 컬렉션에서 찰떡같은 로컬 스타일링 공수 중...", delaySeconds: 0.6 },
      { stage: "Vibe Deployed", text: "🎸 완벽히 살아 숨 쉬는 인터랙티브 결과물이 완성되었습니다. 지금 바로 조작하세요!", delaySeconds: 0.5 }
    ];

    if (resultType === "CREATIVE_SCRIPT") {
      res.json({
        logs: fallbackLogs,
        resultType: "CREATIVE_SCRIPT",
        resultTitle: `🎬 ${idea.length > 25 ? idea.substring(0, 22) + "..." : idea} (긴급 대안 극본)`,
        resultSubtitle: "구글의 503 폭포수를 극복한 대한민국 1인 바이브 개발자의 가내수공업 연극 스테이지",
        creativeScript: {
          genre: "극단적 하이퍼리얼리즘 숏폼 코미디",
          runningTime: "59초 (조회수 200만 장담)",
          characters: [
            { name: "민우 (25세)", roleDescription: "바이브 하나로 살고사는 천재 방구석 빌더. 마라탕 러버." },
            { name: "대왕 AI (신수급)", roleDescription: "트래픽이 너무 몰려 503 에러를 뿜으며 자고 있는 우주의 거대 뇌." }
          ],
          scenes: [
            {
              sceneNum: 1,
              place: "새벽의 성수동 공유오피스 구석지",
              timeOfDay: "새벽 2시 59분",
              setupDescription: "모니터의 퍼런 광선 아래 민우가 키보드를 함마로 후려치고 있다. 등 뒤로 영롱한 AI의 잠꼬대가 아지랑이 친다.",
              lines: [
                { speaker: "민우", dialogue: "아니 내 야심작 바이브 빌드 버튼을 눌렀는데 구글 서버 점검이라니 이게 무슨 청천벽력이야!! 대답해라 우주의 뇌!", expression: "키보드를 샷건치며 절규한다" },
                { speaker: "대왕 AI", dialogue: "드르렁... 쿨... 현재 사용자가 폭증하여 임시로 휴업 중입니다... 내일 오세요...", expression: "503 에러 팝업을 품은 구름 속에서 잠꼬대를 한다" },
                { speaker: "민우", dialogue: "에잇 귀찮다! 인공지능이 안 짜주면 바이브 장인의 본능적 노가다 하드코딩으로 극복하면 그만이다! `import { LocalVibe } from 'my-soul';`!", expression: "눈빛을 빛내며" }
              ]
            },
            {
              sceneNum: 2,
              place: "공유오피스 탕비실 커피머신 앞",
              timeOfDay: "새벽 3시 10분",
              setupDescription: "민우가 믹스커피 두 봉을 입에 탈탈 털어 넣으며 환하게 웃고 있다.",
              lines: [
                { speaker: "대왕 AI", dialogue: "허어억... 인공지능 없이 직접 다 짜버렸다고? 이 유쾌함과 독기는 대체 뭐냐... 참을 수 없다. 조회수 200만 필터를 깔아주마!", expression: "잠에서 깨어 눈을 깜빡이며" },
                { speaker: "민우", dialogue: "후후 역시 요즘 갬성은 템플릿보단 땀내 나는 하드코딩이 최고죠. 부장님도 마라탕 푸주 도로 내놓으십쇼!", expression: "커피를 들이켜며 엄지를 척 세운다" }
              ]
            }
          ],
          directorComment: "★ 틱톡/릴스 배포 팁: 첫 2초에 키보드 샷건 사운드를 극대화하세요. 밈 해시태그 추천: #바이브코딩 #503위기극복 #개발자라이프 #푸주돌려줘"
        }
      });
    } else {
      // Return a fully functioning interactable APP_UI_MOCKUP
      const isTodo = normalized.includes("투두") || normalized.includes("todo") || normalized.includes("할일");
      const appName = isTodo ? "귀차니즘 극복용 야생의 투두" : `${idea.split(' ')[0] || '바이브'} 만능 헬퍼`;
      const theme = normalized.includes("95") || normalized.includes("레트로") || normalized.includes("retro") ? "retro-90s" : "dark-neon";
      
      res.json({
        logs: fallbackLogs,
        resultType: "APP_UI_MOCKUP",
        resultTitle: `⚡ ${idea.length > 20 ? idea.substring(0, 18) + "..." : idea} (야생의 로컬 빌드)`,
        resultSubtitle: "구글의 일시적 503 트래픽 과부하를 비웃듯, 에이전트 영혼에서 공수해 온 실시간 상호작용 앱",
        appMockup: {
          appName,
          theme,
          tagline: "구글 API 점검 중에도 완벽하게 작동하는 불꽃 코더의 의리",
          stats: [
            { label: "인간지능 회복력", value: "314%", change: "UP" },
            { label: "야근 지수", value: "MAX", change: "🔥" },
            { label: "시뮬레이션 서버", value: "99.9%", change: "LIVE" }
          ],
          items: [
            { id: "fallback-item-1", title: "구글 503 에러를 유머있게 넘기고 긴급 챗 구동하기", subtitle: "오히려 더 힙하고 솔직하다", completed: true, badge: "RESILIENT", badgeColor: "emerald" },
            { id: "fallback-item-2", title: "인공지능 코더와 대충 맥주 타임 갖기", subtitle: "테일윈드가 구원한 방구석 영웅", completed: false, badge: "HYDRATE", badgeColor: "sky" },
            { id: "fallback-item-3", title: "스파게티 코드에서 귀중한 면발 3가닥 발견하기", subtitle: "의외로 아주 맛있음", completed: false, badge: "SPAGHETTI", badgeColor: "rose" }
          ],
          buttons: [
            { id: "fallback-btn-1", label: "멘탈 보듬기 토스트 뿜기", actionType: "toast_snack", successMessage: "✨ 개발자 영혼 충전 완료! 구글 서버가 기겁하고 돌아올 것만 같습니다." },
            { id: "fallback-btn-2", label: "야생의 생각 한움큼 추가", actionType: "add_item", successMessage: "📝 리스트에 엉뚱하고 유쾌한 신규 라이브 미션이 탑재되었습니다!" }
          ],
          extraMarkdown: "   ___________________________\n  < 바이브 코딩 fall-back v2 >\n   ---------------------------\n          \\   ^__^\n           \\  (oo)\\_______\n              (__)\\       )\\/\\\n                  ||----w |\n                  ||     ||\n\n- 로컬 인메모리 복구 엔진 가동 중.\n- 구글 API는 가끔 쉴 수 있지만,\n- 유저님의 바이브를 향한 제 의리는 연중무휴입니다!"
        }
      });
    }
  }
});

// A standard, robust proxy route for keyless real-time Wikipedia search API to bypass CORS
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  const lang = req.query.lang || "ko";
  const limit = req.query.limit || "12";
  
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "검색어를 명확히 입력해주세요!" });
  }

  try {
    const wikiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&utf8=1&format=json&origin=*&srlimit=${limit}&srsearch=${encodeURIComponent(query)}`;
    
    const response = await fetch(wikiUrl, {
      headers: {
        "User-Agent": "VibeFind-SearchEngine/1.0 (jeonseungheonjeon@gmail.com)"
      }
    });

    if (!response.ok) {
      throw new Error(`Wikipedia API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const wikiArticles = data?.query?.search || [];

    const mappedResults = wikiArticles.map((article: any) => {
      // Clean HTML tags like <span class="searchmatch">...</span> from the snippet
      const cleanSnippet = article.snippet
        ? article.snippet.replace(/<\/?[^>]+(>|$)/g, "")
        : "설명 요약이 존재하지 않는 항목입니다.";

      return {
        id: `wiki-${article.pageid}`,
        title: article.title,
        snippet: cleanSnippet,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(article.title)}`,
        wordcount: article.wordcount || 0,
        timestamp: article.timestamp || new Date().toISOString(),
        source: lang === "ko" ? "위키백과 (Wikipedia Ko)" : "Wikipedia (En)"
      };
    });

    res.json({ results: mappedResults });
  } catch (error: any) {
    console.error("Wikipedia Search Proxy Error:", error);
    res.status(500).json({ error: `실시간 정보를 불러오는 데 실패했습니다: ${error.message}` });
  }
});

// Serve assets in Production or mount Vite in Development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Vibe Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
