import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class TextdateiLesenSchreiben {
    public static void main(String[] args) throws IOException {
        Path datei = Files.createTempFile("codeheartbeat-", ".txt");
        Files.writeString(datei, "Java-Dateien sicher verarbeiten");

        String inhalt = Files.readString(datei);
        System.out.println("Dateiinhalt: " + inhalt);

        Files.deleteIfExists(datei);
    }
}
