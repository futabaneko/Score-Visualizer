import os
import json
import time
import gspread
import pyperclip
import customtkinter
from dotenv import load_dotenv
from oauth2client.service_account import ServiceAccountCredentials

def connect_gspread(jsonf,key):
    scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']
    credentials = ServiceAccountCredentials.from_json_keyfile_name(jsonf, scope)
    gc = gspread.authorize(credentials)
    SPREADSHEET_KEY = key
    worksheet = gc.open_by_key(SPREADSHEET_KEY).sheet1
    return worksheet

# ここを変更する
load_dotenv()
jsonf = os.getenv("JSON_FILE")
spread_sheet_key = os.getenv("SPREAD_SHEET_KEY")
ws = connect_gspread(jsonf, spread_sheet_key)

alps = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

def make_score(App):
    data = ws.get_all_values()
    ans = []
    
    start, end = int(data[6][3]), int(data[6][7])
    last = start
    for i in range(9 + start, 9 + end):
        time = i - 9
        for j in range(2, 75):
            t = data[i][j].replace("■", "").replace("●", "").replace("▲", "")
            if t == "":
                continue
            
            if last != time:
                ans.append(str(time - last))
                last = time
            
            for s in t:
                scale = j - 2

                if s == "*":
                    u = ""
                    scale -= 24
                
                else:
                    u = s

                    if u == "(":
                        scale -= 0
                    
                    elif u == ")":
                        scale -= 12
                    
                    elif u in "\^!?":
                        scale -= 24
                    
                    elif u == "@":
                        scale -= 36
                    
                    elif u in "_,/":
                        scale -= 48
                
                if scale < 0 or 25 < scale:
                    continue
                
                ans.append(u + alps[scale])

    res = "".join(ans)

    global score
    score = res

def restoration_from_score(score):
    if score == "":
        score = ""

    score = score.replace("\n", "")  # 余分な改行を削除

    tempdata = {}
    symbols = "!/\?_,^@*()"
    numbers = "1234567890"
    num = 0
    lastsymbol = ""

    lastnum = "0"
    for s in score:
        if s in numbers:
            lastnum = lastnum + s
            continue
        else:
            num += int(lastnum)
            lastnum = "0"

        if s in symbols:
            lastsymbol = s

        elif s == " ":
            continue

        else:
            if num not in tempdata:
                tempdata[num] = []

            if s[-1] in alps:  # 修正: alps に含まれているか確認
                tempdata[num].append(lastsymbol + s)
            lastsymbol = ""

    maxindex = max(tempdata.keys(), default=0)  # 空のときにエラー防止
    data = [["" for _ in range(72)] for _ in range(maxindex + 1)]
    
    for key in tempdata.keys():
        for s in tempdata[key]:
            if s[-1] not in alps:  # 修正: alps に含まれているか確認
                continue

            alpsid = alps.index(s[-1])

            if len(s) == 1:
                alpsid += 24

            elif s[0] == ")":
                alpsid += 12

            elif s[0] in "\^!?":
                alpsid += 24

            elif s[0] == "@":
                alpsid += 36

            elif s[0] in "_,/":
                alpsid += 48

            if len(s) == 1:
                data[key][alpsid] += "*"

            else:
                data[key][alpsid] += s[0]

    ws.update(range_name=f'C10:CB{9 + len(data)}', values=data)
    ws.update_cell(7, 4, 0)
    ws.update_cell(7, 8, len(data))

    print("楽譜を復元しました。")

# print("コマンドを入力してください")
# print("- $ make: 楽譜を生成します。")
# print("- $ restoration: 楽譜を復元します。")
# print("- $ end: アプリケーションを終了します。")
# while True:
#     S = input("$ ")
    
#     if S == "make":
#         make_score()
    
#     if S == "restoration":
#         score = ws.cell(7, 6).value
#         print(score)
#         restoration_from_score(r"{}".format(score))
    
#     if S == "end":
#         break

FONT_TYPE = "meiryo"

class App(customtkinter.CTk):

    def __init__(self):
        super().__init__()

        # メンバー変数の設定
        self.fonts = (FONT_TYPE, 15)
        # フォームサイズ設定
        self.geometry("500x400")
        self.title("Basic GUI")

        # フォームのセットアップ
        self.setup_form()
    
    def setup_form(self):
        # CustomTkinter のフォームデザイン設定
        customtkinter.set_appearance_mode("light")  # Modes: system (default), light, dark
        customtkinter.set_default_color_theme("blue")  # Themes: blue (default), dark-blue, green

        self.label = customtkinter.CTkLabel(master=self, text="", text_color="black", font=self.fonts)
        self.label.place(x=50, y=25)

        self.textbox = customtkinter.CTkTextbox(master=self, width=400, height=200, font=self.fonts, wrap="char")
        self.textbox.place(x=50, y=50)

        self.button_copy = customtkinter.CTkButton(master=self, text="コピー", command=self.copy_to_clipboard, font=self.fonts)
        self.button_copy.place(x=280, y=275)

        self.button_make = customtkinter.CTkButton(master=self, text="楽譜の作成", command=self.function_button_make, font=self.fonts)
        self.button_make.place(x=70, y=275)

        self.button_restoration = customtkinter.CTkButton(master=self, text="楽譜の復元", command=self.function_button_restoration, font=self.fonts)
        self.button_restoration.place(x=70, y=325)

        self.button_end = customtkinter.CTkButton(master=self, text="終了", command=self.function_button_end, font=self.fonts)
        self.button_end.place(x=280, y=325)

    def function_button_make(self):
        make_score(self)
        time.sleep(0.5)
        self.textbox.delete("1.0", customtkinter.END)  # 既存のテキストをクリア
        self.textbox.insert("1.0", score)  # テキストを挿入
        self.label.configure(text="楽譜を作成しました", text_color="black", font=self.fonts)

    def function_button_restoration(self):
        score = self.textbox.get("1.0", customtkinter.END)
        restoration_from_score(r"{}".format(score))
        self.label.configure(text="楽譜を復元しました", text_color="black", font=self.fonts)

    def copy_to_clipboard(self):
        text = self.textbox.get("1.0", customtkinter.END) # テキストボックスの内容を取得
        pyperclip.copy(text)  # クリップボードにコピー
        self.label.configure(text="コピーしました", text_color="black", font=self.fonts)

    def function_button_end(self):    
        exit()

score = ""
if __name__ == "__main__":
    # アプリケーション実行
    app = App()
    app.mainloop()