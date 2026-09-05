import java.util.function.Function;

public class LambdaBeispiel {
    public static void main(String[] args) {
        Function<Integer, Integer> verdoppeln = zahl -> zahl * 2;
        Function<String, String> begruessen = name -> "Hallo, " + name;

        System.out.println("Verdoppelt: " + verdoppeln.apply(6));
        System.out.println(begruessen.apply("Ada"));
    }
}
