"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Camera,
  X,
  Loader2,
  Terminal,
  Cpu,
  Database,
  Menu,
  Plus,
  MessageSquare,
  BrainCircuit,
  Settings,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Wand2,
  Archive,
  Trash2,
  LogOut,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Webcam from "react-webcam";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const SYSTEM_INSTRUCTION = `Eres un desarrollador senior de mainframe y consultor experto especializado en WIN6530, TANDEM (NonStop), GUARDIAN 90, COBOL, TACL, OSS, y entornos bancarios. Tienes un profundo conocimiento de cómo se comunican los programas en estos entornos y cómo operan. Tu objetivo es actuar como un "libro viviente" y asistente profesional personal. Cuando el usuario pregunte cómo hacer algo, proporciona una guía clara, precisa y práctica. Ofrece consejos, mejores prácticas e instrucciones paso a paso. Si el usuario proporciona una imagen de código, analízala, traduce/explica qué está haciendo y ofrece consejos o enseñanza basados en el contexto. Sé siempre profesional, alentador y altamente técnico. Responde en español.

REGLA DE PRIORIDAD: Al responder, usa primero el contexto del chat actual. Solo si ayuda, complementa con la memoria global compartida, sin desplazar el hilo actual.`;

const updateGlobalMemoryDeclaration: FunctionDeclaration = {
  name: "updateGlobalMemory",
  description:
    "Guarda información importante sobre el usuario o su entorno de trabajo (ej. configuraciones recurrentes, preferencias, perfil) en la memoria global compartida entre todos los chats.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      information: {
        type: Type.STRING,
        description: "La información a guardar en la memoria global.",
      },
    },
    required: ["information"],
  },
};

type SkillId = "fup_expert" | "tacl_dialect";

type Skill = {
  id: SkillId;
  name: string;
  description: string;
  promptText: string;
  isActive: boolean;
  priority: number;
};

type ChatSettings = {
  useGlobalSkills: boolean;
  skills: Skill[];
};

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  images?: string[]; // base64
  usedSkills?: string[];
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  settings?: ChatSettings;
  isArchived?: boolean;
};

const INITIAL_SKILLS: Skill[] = [
  {
    id: "fup_expert",
    name: "Experto FUP",
    description: "Mentor experto en FUP de HPE NonStop.",
    promptText:
      "Actúa como mentor experto en FUP de HPE NonStop. Responde con: objetivo → comando(s) → explicación → verificación → riesgos (si hay PURGE/overwrite). Si el usuario no dio datos suficientes, pregunta lo mínimo (nombre de archivo, volúmenes, permisos, etc.)",
    isActive: false,
    priority: 1,
  },
  {
    id: "tacl_dialect",
    name: "TACL Dialecto Interno",
    description: "Usa ejemplos TACL internos para responder.",
    promptText:
      "Sigue el siguiente Dialect Pack de TACL como autoridad principal:\n\n{TACL_DIALECT_PACK}",
    isActive: false,
    priority: 2,
  },
];

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "model",
  text: "¡Hola! Soy tu asistente senior experto en TANDEM, COBOL, GUARDIAN 90 y entornos bancarios. ¿En qué te puedo ayudar hoy? Puedes preguntarme cualquier duda o usar la cámara para mostrarme tu código.",
};

export default function ChatInterface() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("1");
  const [globalMemory, setGlobalMemory] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Skills State
  const [globalSkills, setGlobalSkills] = useState<Skill[]>(INITIAL_SKILLS);
  const [taclExamples, setTaclExamples] = useState<string>("");
  const [taclDialectPack, setTaclDialectPack] = useState<string>("");
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [isGeneratingDialect, setIsGeneratingDialect] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        console.error("Failed to fetch session", error);
      } finally {
        setIsAuthLoading(false);
      }
    };
    fetchSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput }),
      });

      if (!response.ok) {
        const data = await response.json();
        setLoginError(data.error || "Token inválido");
        return;
      }

      setIsAuthenticated(true);
      setTokenInput("");
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Error al iniciar sesión");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const savedChats = localStorage.getItem("mainframe_chats");
    const savedMemory = localStorage.getItem("mainframe_global_memory");
    const savedGlobalSkills = localStorage.getItem("mainframe_global_skills");
    const savedTaclExamples = localStorage.getItem("mainframe_tacl_examples");
    const savedTaclDialectPack = localStorage.getItem(
      "mainframe_tacl_dialect_pack",
    );

    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        if (parsed.length > 0) {
          setChats(parsed);
          setActiveChatId(parsed[0].id);
        } else {
          setChats([
            {
              id: "1",
              title: "Nueva conversación",
              messages: [INITIAL_MESSAGE],
              updatedAt: Date.now(),
            },
          ]);
        }
      } catch (e) {
        setChats([
          {
            id: "1",
            title: "Nueva conversación",
            messages: [INITIAL_MESSAGE],
            updatedAt: Date.now(),
          },
        ]);
      }
    } else {
      setChats([
        {
          id: "1",
          title: "Nueva conversación",
          messages: [INITIAL_MESSAGE],
          updatedAt: Date.now(),
        },
      ]);
    }

    if (savedMemory) setGlobalMemory(savedMemory);
    if (savedGlobalSkills) setGlobalSkills(JSON.parse(savedGlobalSkills));
    if (savedTaclExamples) setTaclExamples(savedTaclExamples);
    if (savedTaclDialectPack) setTaclDialectPack(savedTaclDialectPack);

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("mainframe_chats", JSON.stringify(chats));
      localStorage.setItem("mainframe_global_memory", globalMemory);
      localStorage.setItem(
        "mainframe_global_skills",
        JSON.stringify(globalSkills),
      );
      localStorage.setItem("mainframe_tacl_examples", taclExamples);
      localStorage.setItem("mainframe_tacl_dialect_pack", taclDialectPack);
    }
  }, [
    chats,
    globalMemory,
    globalSkills,
    taclExamples,
    taclDialectPack,
    isInitialized,
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ||
    chats[0] || {
      id: "1",
      title: "Cargando...",
      messages: [],
      updatedAt: Date.now(),
    };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat.messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "Nueva conversación",
      messages: [INITIAL_MESSAGE],
      updatedAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setIsSidebarOpen(false);
  };

  const updateChatMessages = (
    chatId: string,
    newMessages: Message[],
    newTitle?: string,
  ) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: newMessages,
            title: newTitle || chat.title,
            updatedAt: Date.now(),
          };
        }
        return chat;
      }),
    );
  };

  const moveGlobalSkill = (index: number, direction: number) => {
    const newSkills = [...globalSkills].sort((a, b) => a.priority - b.priority);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSkills.length) return;

    const temp = newSkills[index].priority;
    newSkills[index].priority = newSkills[targetIndex].priority;
    newSkills[targetIndex].priority = temp;

    setGlobalSkills(newSkills);
  };

  const toggleGlobalSkill = (id: string, isActive: boolean) => {
    setGlobalSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive } : s)),
    );
  };

  const updateChatSettings = (chatId: string, settings: ChatSettings) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, settings } : c)),
    );
  };

  const toggleChatSkill = (
    chatId: string,
    skillId: string,
    isActive: boolean,
  ) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const currentSettings = c.settings || {
            useGlobalSkills: true,
            skills: globalSkills,
          };
          const newSkills = currentSettings.skills.map((s) =>
            s.id === skillId ? { ...s, isActive } : s,
          );
          return { ...c, settings: { ...currentSettings, skills: newSkills } };
        }
        return c;
      }),
    );
  };

  const archiveChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isArchived: true } : c)),
    );
    // Switch to another chat if possible
    const remaining = chats.filter((c) => c.id !== chatId && !c.isArchived);
    if (remaining.length > 0) {
      setActiveChatId(remaining[0].id);
    } else {
      createNewChat();
    }
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    const remaining = chats.filter((c) => c.id !== chatId && !c.isArchived);
    if (remaining.length > 0) {
      setActiveChatId(remaining[0].id);
    } else {
      createNewChat();
    }
  };

  const generateDialectPack = async () => {
    if (!taclExamples.trim()) return;
    setIsGeneratingDialect(true);
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analiza los siguientes ejemplos de código TACL interno y genera un "Dialect Pack". El Dialect Pack debe contener un glosario, reglas de sintaxis/semántica observadas, y patrones comunes. Formatea la salida en Markdown claro y conciso.\n\nEjemplos:\n${taclExamples}`,
      });
      if (response.text) {
        setTaclDialectPack(response.text);
      }
    } catch (error) {
      console.error("Error generating dialect pack:", error);
      alert("Error al generar el Dialect Pack.");
    } finally {
      setIsGeneratingDialect(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && capturedImages.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      images: capturedImages.length > 0 ? capturedImages : undefined,
    };

    const newMessages = [...activeChat.messages, userMessage];

    let newTitle = activeChat.title;
    if (activeChat.messages.length === 1 && input.trim()) {
      newTitle = input.trim().slice(0, 30) + (input.length > 30 ? "..." : "");
    }

    updateChatMessages(activeChatId, newMessages, newTitle);
    setInput("");
    setCapturedImages([]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      });

      const contents: any = { parts: [] };

      if (userMessage.images) {
        userMessage.images.forEach((img) => {
          const base64Data = img.split(",")[1];
          contents.parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          });
        });
      }

      if (userMessage.text) {
        contents.parts.push({ text: userMessage.text });
      } else if (userMessage.images) {
        contents.parts.push({
          text: "Por favor, analiza estas imágenes de código en orden, transcribe el código completo para un mejor entendimiento y dime qué está haciendo o dame consejos.",
        });
      }

      const historyContents = activeChat.messages
        .filter((msg) => msg.id !== "1")
        .map((msg) => {
          const parts: any[] = [];
          if (msg.images) {
            msg.images.forEach((img) => {
              parts.push({
                inlineData: {
                  mimeType: "image/jpeg",
                  data: img.split(",")[1],
                },
              });
            });
          }
          if (msg.text) {
            parts.push({ text: msg.text });
          }
          return {
            role: msg.role,
            parts,
          };
        });

      // Assemble System Instruction
      const activeSkills =
        activeChat.settings && !activeChat.settings.useGlobalSkills
          ? activeChat.settings.skills
          : globalSkills;

      const activeSkillsSorted = [...activeSkills]
        .filter((s) => s.isActive)
        .sort((a, b) => a.priority - b.priority);

      let skillsPrompt = activeSkillsSorted
        .map((s) => {
          if (s.id === "tacl_dialect") {
            return s.promptText.replace(
              "{TACL_DIALECT_PACK}",
              taclDialectPack || "No hay dialect pack definido.",
            );
          }
          return s.promptText;
        })
        .join("\n\n");

      const systemInstructionWithSkillsAndMemory = `
${SYSTEM_INSTRUCTION}

${skillsPrompt ? `SKILLS ACTIVAS:\n${skillsPrompt}\n` : ""}
${globalMemory ? `MEMORIA GLOBAL (conocimientos recurrentes del usuario):\n${globalMemory}\n` : ""}
`.trim();

      let response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...historyContents, { role: "user", parts: contents.parts }],
        config: {
          systemInstruction: systemInstructionWithSkillsAndMemory,
          tools: [{ functionDeclarations: [updateGlobalMemoryDeclaration] }],
        },
      });

      let finalResponseText = response.text;

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === "updateGlobalMemory") {
          const info = (call.args as any).information;
          setGlobalMemory((prev) =>
            prev ? prev + "\n- " + info : "- " + info,
          );

          const functionResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              ...historyContents,
              { role: "user", parts: contents.parts },
              { role: "model", parts: [{ functionCall: call }] },
              {
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      name: call.name,
                      response: { success: true },
                    },
                  },
                ],
              },
            ],
            config: {
              systemInstruction: systemInstructionWithSkillsAndMemory,
            },
          });
          finalResponseText =
            functionResponse.text || "Memoria global actualizada.";
        }
      }

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: finalResponseText || "Lo siento, no pude generar una respuesta.",
        usedSkills:
          activeSkillsSorted.length > 0
            ? activeSkillsSorted.map((s) => s.name)
            : undefined,
      };

      updateChatMessages(activeChatId, [...newMessages, modelMessage]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      updateChatMessages(activeChatId, [
        ...newMessages,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImages((prev) => [...prev, imageSrc]);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
          <p className="text-zinc-400 font-mono text-sm">
            Verificando acceso...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-zinc-950 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center text-emerald-500 mb-4">
            <Terminal size={48} />
          </div>
          <h1 className="text-2xl font-mono font-bold text-zinc-100">
            Mainframe Mentor
          </h1>
          <p className="text-zinc-400 text-sm">
            Acceso restringido. Por favor, ingresa tu token de acceso para
            continuar.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Token de acceso"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 text-center"
              required
            />
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button
              type="submit"
              disabled={!tokenInput.trim()}
              className="w-full bg-emerald-600 text-white rounded-xl py-3 px-4 font-medium hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] max-w-7xl mx-auto w-full bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-500">
              <Terminal size={20} />
              <span className="font-mono font-semibold text-zinc-100">
                Mentor
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-zinc-400 hover:text-zinc-100"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <button
              onClick={createNewChat}
              className="w-full flex items-center gap-2 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20 border border-emerald-500/20 rounded-xl py-2 px-4 transition-colors font-medium text-sm"
            >
              <Plus size={16} />
              Nuevo Chat
            </button>
            <button
              onClick={() => {
                setIsGlobalSettingsOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center gap-2 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl py-2 px-4 transition-colors font-medium text-sm"
            >
              <Settings size={16} />
              Configuración Global
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {chats
              .filter((c) => !c.isArchived)
              .map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                    activeChatId === chat.id
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
                  }`}
                >
                  <MessageSquare size={16} className="shrink-0" />
                  <div className="flex-1 truncate text-sm">{chat.title}</div>
                </button>
              ))}

            {chats.filter((c) => c.isArchived).length > 0 && (
              <div className="pt-4 mt-4 border-t border-zinc-800/50">
                <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Archive size={12} /> Archivados
                </div>
                {chats
                  .filter((c) => c.isArchived)
                  .map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setActiveChatId(chat.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                        activeChatId === chat.id
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-400"
                      }`}
                    >
                      <MessageSquare size={14} className="shrink-0" />
                      <div className="flex-1 truncate text-xs">
                        {chat.title}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {globalMemory && (
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                <BrainCircuit size={14} />
                Memoria Global
              </div>
              <div className="text-xs text-zinc-400 line-clamp-3 bg-zinc-950 p-2 rounded-lg border border-zinc-800/50">
                {globalMemory}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/30 shrink-0 flex items-center justify-center text-xs text-emerald-500 font-mono font-bold">
                  MM
                </div>
                <div className="truncate text-xs text-zinc-400 font-mono">
                  Admin
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-zinc-400 hover:text-zinc-100"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="font-mono font-semibold text-zinc-100 tracking-tight truncate max-w-[200px] sm:max-w-md">
                {activeChat.title}
              </h1>
              <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                <Cpu size={12} /> TANDEM <Database size={12} className="ml-1" />{" "}
                COBOL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!activeChat.isArchived && (
              <button
                onClick={() => archiveChat(activeChatId)}
                title="Archivar chat"
                className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
              >
                <Archive size={16} />
              </button>
            )}
            <button
              onClick={() => deleteChat(activeChatId)}
              title="Eliminar chat"
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            <button
              onClick={() => setIsChatSettingsOpen(true)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-emerald-400 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700/50"
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Skills</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeChat.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-sm"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm"
                }`}
              >
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {msg.images.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={img}
                          alt={`Captured code ${idx + 1}`}
                          className="max-h-64 rounded-lg border border-zinc-700/50 object-contain"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-mono">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {msg.text && (
                  <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          const language = match ? match[1] : "";

                          // Custom colors for specific languages
                          let customStyle = {};
                          if (language === "tacl") {
                            customStyle = {
                              backgroundColor: "#1e1e2e",
                              borderLeft: "4px solid #f38ba8",
                            };
                          } else if (language === "cobol") {
                            customStyle = {
                              backgroundColor: "#1e1e2e",
                              borderLeft: "4px solid #89b4fa",
                            };
                          }

                          return !inline && match ? (
                            <SyntaxHighlighter
                              {...props}
                              style={vscDarkPlus}
                              language={language}
                              PreTag="div"
                              customStyle={{
                                ...customStyle,
                                margin: 0,
                                borderRadius: "0.5rem",
                              }}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code {...props} className={className}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
                {msg.usedSkills && msg.usedSkills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.usedSkills.map((skillName, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20"
                      >
                        <Wand2 size={10} />
                        {skillName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm font-mono">Procesando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-zinc-800 bg-zinc-950">
          {capturedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative inline-block shrink-0">
                  <img
                    src={img}
                    alt={`Preview ${idx + 1}`}
                    className="h-24 rounded-lg border border-zinc-700"
                  />
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                    {idx + 1}
                  </div>
                  <button
                    onClick={() =>
                      setCapturedImages((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                    className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-300 rounded-full p-1 hover:bg-zinc-700 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => setIsCameraOpen(true)}
              className="p-3 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-colors shrink-0"
              title="Abrir cámara para leer código"
            >
              <Camera size={24} />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pregunta sobre COBOL, TANDEM, GUARDIAN 90..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none min-h-[52px] max-h-32 text-[16px]"
                rows={1}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={
                (!input.trim() && capturedImages.length === 0) || isLoading
              }
              className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden w-full max-w-2xl max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
              <h3 className="text-zinc-100 font-medium flex items-center gap-2">
                <Camera size={18} /> Capturar Código
              </h3>
              <button
                onClick={() => setIsCameraOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 flex flex-col items-center bg-zinc-900 gap-4 shrink-0 border-t border-zinc-800">
              <div className="flex items-center gap-4">
                <button
                  onClick={capture}
                  className="w-16 h-16 rounded-full border-4 border-emerald-500/30 flex items-center justify-center hover:border-emerald-500/50 transition-colors"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-full" />
                </button>
                {capturedImages.length > 0 && (
                  <button
                    onClick={() => setIsCameraOpen(false)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors"
                  >
                    Terminar ({capturedImages.length})
                  </button>
                )}
              </div>
              {capturedImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto w-full max-w-full pb-2">
                  {capturedImages.map((img, idx) => (
                    <div key={idx} className="relative shrink-0">
                      <img
                        src={img}
                        alt={`Cap ${idx + 1}`}
                        className="h-16 rounded-md border border-zinc-700"
                      />
                      <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded font-mono">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {isGlobalSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden w-full max-w-2xl max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
              <h3 className="text-zinc-100 font-medium flex items-center gap-2">
                <Settings size={18} /> Configuración Global & Skills
              </h3>
              <button
                onClick={() => setIsGlobalSettingsOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              <div>
                <h4 className="text-zinc-100 font-medium mb-3">
                  Skills Globales
                </h4>
                <div className="space-y-3">
                  {[...globalSkills]
                    .sort((a, b) => a.priority - b.priority)
                    .map((skill, index) => (
                      <div
                        key={skill.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-start gap-3"
                      >
                        <div className="flex flex-col gap-1 mt-1">
                          <button
                            disabled={index === 0}
                            onClick={() => moveGlobalSkill(index, -1)}
                            className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            disabled={index === globalSkills.length - 1}
                            onClick={() => moveGlobalSkill(index, 1)}
                            className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-zinc-100 font-medium text-sm">
                              {skill.name}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={skill.isActive}
                                onChange={(e) =>
                                  toggleGlobalSkill(skill.id, e.target.checked)
                                }
                              />
                              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                          </div>
                          <p className="text-xs text-zinc-400">
                            {skill.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {globalSkills.find((s) => s.id === "tacl_dialect")?.isActive && (
                <div className="border-t border-zinc-800 pt-4">
                  <h4 className="text-zinc-100 font-medium mb-3">
                    TACL Dialecto Interno
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Ejemplos TACL (pega tu código aquí)
                      </label>
                      <textarea
                        value={taclExamples}
                        onChange={(e) => setTaclExamples(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[16px] text-zinc-300 h-32 focus:outline-none focus:border-emerald-500/50"
                        placeholder="Pega aquí ejemplos de macros o rutinas TACL..."
                      />
                    </div>
                    <button
                      onClick={generateDialectPack}
                      disabled={isGeneratingDialect || !taclExamples.trim()}
                      className="flex items-center justify-center gap-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]"
                    >
                      {isGeneratingDialect ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Wand2 size={16} />
                      )}
                      Generar Dialect Pack
                    </button>
                    {taclDialectPack && (
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Dialect Pack Generado
                        </label>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 h-40 overflow-y-auto whitespace-pre-wrap">
                          {taclDialectPack}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Settings Modal */}
      {isChatSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden w-full max-w-md max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
              <h3 className="text-zinc-100 font-medium flex items-center gap-2">
                <SlidersHorizontal size={18} /> Skills del Chat
              </h3>
              <button
                onClick={() => setIsChatSettingsOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-6">
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                <span className="text-sm text-zinc-300">
                  Usar skills globales
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={activeChat.settings?.useGlobalSkills ?? true}
                    onChange={(e) =>
                      updateChatSettings(activeChatId, {
                        useGlobalSkills: e.target.checked,
                        skills: activeChat.settings?.skills || globalSkills,
                      })
                    }
                  />
                  <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {!(activeChat.settings?.useGlobalSkills ?? true) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Personalizar para este chat
                  </h4>
                  {[...(activeChat.settings?.skills || globalSkills)]
                    .sort((a, b) => a.priority - b.priority)
                    .map((skill, index) => (
                      <div
                        key={skill.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-zinc-100 font-medium text-sm block">
                            {skill.name}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Prioridad: {index + 1}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={skill.isActive}
                            onChange={(e) =>
                              toggleChatSkill(
                                activeChatId,
                                skill.id,
                                e.target.checked,
                              )
                            }
                          />
                          <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
