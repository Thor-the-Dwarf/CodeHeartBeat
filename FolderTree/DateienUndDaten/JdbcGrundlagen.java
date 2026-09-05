import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class JdbcGrundlagen {
    public static void findeBenutzer(Connection verbindung, int id) throws SQLException {
        String sql = "SELECT name FROM benutzer WHERE id = ?";

        try (PreparedStatement anweisung = verbindung.prepareStatement(sql)) {
            anweisung.setInt(1, id);
            try (ResultSet ergebnis = anweisung.executeQuery()) {
                if (ergebnis.next()) {
                    System.out.println(ergebnis.getString("name"));
                }
            }
        }
    }
}
