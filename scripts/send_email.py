# -*- coding: utf-8 -*-
"""
알림을 Gmail 로 보낸다. alerts.yml 에서 부른다.

비밀번호는 코드에 두지 않는다. 저장소 Settings → Secrets 에서 환경변수로 받는다.
  MAIL_USERNAME  보내는 Gmail 주소
  MAIL_PASSWORD  그 계정의 앱 비밀번호 (구글 계정에 2단계 인증을 켜야 만들 수 있다)
  MAIL_TO        받는 주소. 비우면 MAIL_USERNAME 으로 보낸다

제목·본문은 MAIL_SUBJECT, MAIL_BODY 로 받는다.
Secrets 가 없으면 경고만 남기고 넘어간다. MAIL_REQUIRED=true(테스트 메일)면 실패로 끝낸다.
공개 저장소라 실행 기록이 누구에게나 보이므로 주소는 출력하지 않는다.
"""
import os, smtplib, sys
from email.message import EmailMessage

def main():
    user = os.environ.get("MAIL_USERNAME", "").strip()
    pw   = os.environ.get("MAIL_PASSWORD", "").replace(" ", "")  # 앱 비밀번호는 4자리씩 띄어서 보여준다
    to   = os.environ.get("MAIL_TO", "").strip() or user

    if not user or not pw:
        msg = "MAIL_USERNAME / MAIL_PASSWORD Secrets 가 없어 메일을 보내지 않음"
        if os.environ.get("MAIL_REQUIRED") == "true":
            print("::error::" + msg)
            return 1
        print("::warning::" + msg)
        return 0

    m = EmailMessage()
    m["Subject"] = os.environ.get("MAIL_SUBJECT") or "investment 알림"
    m["From"] = user
    m["To"] = to
    m.set_content(os.environ.get("MAIL_BODY", ""))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as s:
        s.login(user, pw)
        s.send_message(m)
    print("메일 보냄: %s" % m["Subject"])
    return 0

if __name__ == "__main__":
    sys.exit(main())
