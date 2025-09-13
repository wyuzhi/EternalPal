from fish_audio_sdk import Session, ASRRequest
from fish_audio_sdk import Session, TTSRequest, ReferenceAudio



def text_to_mp3(mp3_filename,text):
    session = Session("3aa32d402483478185e818d76256f03c")

    # Option 3: Specifying a specific TTS model using the backend parameter
    with open(mp3_filename, "wb") as f:
        for chunk in session.tts(
            TTSRequest(text=text,reference_id='fee78e7eb3c64506b216610e6502e35b'),
            backend="speech-1.6"  # Specify the TTS model to use
        ):
            f.write(chunk)
    return "success"


def mp3_to_text(file_path):
    session = Session("3aa32d402483478185e818d76256f03c")

    # Read the audio file
    with open(file_path, "rb") as audio_file:
        audio_data = audio_file.read()

    # Option 1: Without specifying language (auto-detect)
    response = session.asr(ASRRequest(audio=audio_data))

    print(f"Transcribed text: {response.text}")
    print(f"Audio duration: {response.duration} seconds")

    for segment in response.segments:
        print(f"Segment: {segment.text}")
        print(f"Start time: {segment.start}, End time: {segment.end}")
    
    return response.text


if __name__ == "__main__":
    print()
    # file_path = 'hi.mp3'
    # re = mp3_to_text(file_path)
    # print(re)
    
    text = "你今天过得开心吗？"
    state = text_to_mp3("output3.mp3",text)
    print(state)
